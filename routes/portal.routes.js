// =====================================================
// PORTAL ROUTES - Add to your backend routes
// File: backend/routes/portal.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// =====================================================
// GET TENANT INFO BY SUBDOMAIN (Public - no auth required)
// =====================================================
router.get('/portal/tenant/:subdomain', async (req, res) => {
    try {
        const { subdomain } = req.params;
        
        if (!subdomain) {
            return res.status(400).json({
                success: false,
                message: 'Subdomain is required'
            });
        }

        // Fetch tenant by subdomain
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select(`
                tenant_id,
                tenant_code,
                subdomain,
                corporate_legal_name,
                corporate_type,
                industry_type,
                country,
                branding_config,
                status
            `)
            .eq('subdomain', subdomain.toLowerCase())
            .eq('status', 'ACTIVE')
            .single();

        if (error || !tenant) {
            return res.status(404).json({
                success: false,
                message: 'Company portal not found or inactive'
            });
        }

        res.json({
            success: true,
            data: tenant
        });

    } catch (error) {
        console.error('Error fetching tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch company information',
            error: error.message
        });
    }
});

// =====================================================
// PORTAL LOGIN (Employee login)
// =====================================================
router.post('/portal/login', async (req, res) => {
    try {
        const { tenant_id, subdomain, employee_id, password } = req.body;

        if (!tenant_id || !employee_id || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // First, verify the tenant exists and is active
        const { data: tenant } = await supabase
            .from('tenants')
            .select('tenant_id, status')
            .eq('tenant_id', tenant_id)
            .eq('status', 'ACTIVE')
            .single();

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Company portal not found or inactive'
            });
        }

        // Find employee by employee_id or email
        const { data: employee, error } = await supabase
            .from('employees')
            .select(`
                employee_id,
                tenant_id,
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                designation,
                department,
                date_of_joining,
                status,
                password_hash
            `)
            .eq('tenant_id', tenant_id)
            .or(`employee_code.eq.${employee_id},email.eq.${employee_id}`)
            .eq('status', 'ACTIVE')
            .single();

        if (error || !employee) {
            return res.status(401).json({
                success: false,
                message: 'Invalid employee ID or password'
            });
        }

        // TODO: Verify password (use bcrypt in production)
        // For now, simple check - REPLACE WITH PROPER PASSWORD HASHING
        // const bcrypt = require('bcrypt');
        // const isValidPassword = await bcrypt.compare(password, employee.password_hash);
        
        // Temporary: Check if password matches (REMOVE IN PRODUCTION)
        const isValidPassword = password === 'demo123' || password === employee.password_hash;

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid employee ID or password'
            });
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                employee_id: employee.employee_id,
                tenant_id: employee.tenant_id,
                email: employee.email,
                type: 'employee'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Remove sensitive data
        delete employee.password_hash;

        // Log login activity
        await supabase.from('activity_logs').insert({
            tenant_id: tenant_id,
            entity_type: 'EMPLOYEE',
            entity_id: employee.employee_id,
            action: 'LOGIN',
            description: `Employee ${employee.first_name} ${employee.last_name} logged in`,
            performed_by: employee.employee_id,
            performed_by_type: 'EMPLOYEE',
            ip_address: req.ip
        });

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                ...employee,
                full_name: `${employee.first_name} ${employee.last_name}`
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// =====================================================
// VERIFY PORTAL TOKEN (Middleware helper)
// =====================================================
router.get('/portal/verify-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        if (decoded.type !== 'employee') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Fetch fresh employee data
        const { data: employee } = await supabase
            .from('employees')
            .select('employee_id, tenant_id, first_name, last_name, email, designation, department, status')
            .eq('employee_id', decoded.employee_id)
            .eq('status', 'ACTIVE')
            .single();

        if (!employee) {
            return res.status(401).json({
                success: false,
                message: 'Employee not found or inactive'
            });
        }

        res.json({
            success: true,
            user: {
                ...employee,
                full_name: `${employee.first_name} ${employee.last_name}`
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

module.exports = router;


// =====================================================
// USAGE: Add to your main app.js or server.js
// =====================================================
/*
const portalRoutes = require('./routes/portal.routes');
app.use('/api', portalRoutes);
*/
