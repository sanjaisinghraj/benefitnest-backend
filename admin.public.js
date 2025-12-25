const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('./db');

// Simple in-memory rate limiting (temporary - for production, use express-rate-limit)
const loginAttempts = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || { count: 0, resetTime: now + 15 * 60 * 1000 };
  
  if (now > attempts.resetTime) {
    loginAttempts.set(email, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return true;
  }
  
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  loginAttempts.set(email, attempts);
  return true;
}

// Admin Login - PUBLIC ROUTE (reCAPTCHA DISABLED for testing)
router.post('/login', async (req, res) => {
  try {
    console.log('=== ADMIN LOGIN ATTEMPT ===');
    console.log('Request body:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Simple rate limiting check
    if (!checkRateLimit(email)) {
      console.log('Rate limit exceeded for:', email);
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts, please try again later.'
      });
    }

    // reCAPTCHA DISABLED FOR TESTING
    console.log('Skipping reCAPTCHA verification (disabled for testing)');

    // Find admin user
    console.log('Searching for admin with email:', email.toLowerCase());
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!admin) {
      console.log('No admin found with email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('Admin found:', { id: admin.id, email: admin.email, is_active: admin.is_active });

    // Check if account is active
    if (!admin.is_active) {
      console.log('Admin account is deactivated');
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    console.log('Updating last login time...');
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT token
    console.log('Generating JWT token...');
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set!');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);
    
    // IMPORTANT: Return token at root level for frontend compatibility
    res.json({
      success: true,
      message: 'Login successful',
      token: token,  // Token at root level for frontend
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    });

  } catch (error) {
    console.error('=== ADMIN LOGIN ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check authentication status
router.get('/check', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, name, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !admin || !admin.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    });

  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
});

module.exports = router;
