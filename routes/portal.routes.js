// =====================================================
// PORTAL ROUTES - Add to your backend routes
// File: backend/routes/portal.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Ensure portals directory exists
const PORTALS_DIR = path.join(__dirname, '../portals');
if (!fs.existsSync(PORTALS_DIR)) {
    fs.mkdirSync(PORTALS_DIR, { recursive: true });
}

// =====================================================
// HELPER: Generate Portal HTML with Branding
// =====================================================
function generatePortalHTML(corporate) {
    const {
        tenant_id,
        corporate_legal_name,
        subdomain,
        branding_config = {},
        logo_url
    } = corporate;

    const primaryColor = branding_config.primary_color || '#2563eb';
    const secondaryColor = branding_config.secondary_color || '#10b981';
    const logoDisplay = logo_url ? `<img src="${logo_url}" alt="${corporate_legal_name}" style="max-width: 80px; max-height: 80px;">` : '🏢';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${corporate_legal_name} - Employee Benefits Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); 
               min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.2); 
                     padding: 48px 40px; max-width: 550px; width: 100%; text-align: center; }
        .logo { width: 100px; height: 100px; margin: 0 auto 32px; border-radius: 12px; 
                background: ${primaryColor}15; display: flex; align-items: center; justify-content: center; 
                font-size: 56px; overflow: hidden; }
        h1 { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .company-name { font-size: 18px; color: #6b7280; margin-bottom: 32px; }
        .badge { display: inline-block; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; 
                 padding: 12px 20px; margin-bottom: 32px; font-size: 14px; color: #92400e; }
        .features { text-align: left; margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 12px; }
        .features h3 { font-size: 13px; color: #374151; margin-bottom: 20px; text-transform: uppercase; }
        .features ul { list-style: none; }
        .features li { padding: 12px 0; color: #4b5563; font-size: 15px; display: flex; gap: 12px; 
                       border-bottom: 1px solid #e5e7eb; }
        .features li:last-child { border-bottom: none; }
        .features li:before { content: "✓"; color: ${primaryColor}; font-weight: bold; }
        .btn { padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; 
               border: none; text-decoration: none; display: inline-block; margin-top: 16px; 
               background: ${primaryColor}; color: white; transition: all 0.3s; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.15); }
        footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${logoDisplay}</div>
        <h1>Welcome</h1>
        <p class="company-name">${corporate_legal_name}</p>
        <div class="badge">⚠️ Portal Under Development - Coming Soon!</div>
        <div class="features">
            <h3>Features Coming Soon</h3>
            <ul>
                <li>View employee benefits</li>
                <li>Access policy documents</li>
                <li>Submit and track claims</li>
                <li>Manage personal info</li>
            </ul>
        </div>
        <button class="btn" onclick="window.location.href='https://www.benefitnest.space'">Visit Main Site</button>
        <footer>
            <p><strong>Powered by BenefitNest</strong></p>
            <p>© ${new Date().getFullYear()} - Portal ID: ${subdomain}</p>
        </footer>
    </div>
</body>
</html>`;
}

// =====================================================
// CHECK IF PORTAL EXISTS
// =====================================================
router.get('/admin/corporates/:tenantId/check-portal', async (req, res) => {
    try {
        const { tenantId } = req.params;
        console.log(`[PORTAL] Checking portal for tenant: ${tenantId}`);

        const { data: corporate } = await supabase
            .from('tenants')
            .select('tenant_id, subdomain, corporate_legal_name')
            .eq('tenant_id', tenantId)
            .single();

        if (!corporate) {
            return res.status(404).json({ success: false, message: 'Corporate not found' });
        }

        const portalPath = path.join(PORTALS_DIR, `${corporate.subdomain}.html`);
        const portalExists = fs.existsSync(portalPath);
        const portalUrl = `https://${corporate.subdomain}.benefitnest.space`;

        res.json({
            success: true,
            data: {
                portal_exists: portalExists,
                portal_url: portalUrl,
                subdomain: corporate.subdomain
            }
        });
    } catch (err) {
        console.error('[PORTAL] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to check portal' });
    }
});

// =====================================================
// CREATE PORTAL
// =====================================================
router.post('/admin/corporates/:tenantId/create-portal', async (req, res) => {
    try {
        const { tenantId } = req.params;
        console.log(`[PORTAL] Creating portal for tenant: ${tenantId}`);

        const { data: corporate } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        if (!corporate) {
            return res.status(404).json({ success: false, message: 'Corporate not found' });
        }

        const portalPath = path.join(PORTALS_DIR, `${corporate.subdomain}.html`);

        // Check if already exists
        if (fs.existsSync(portalPath)) {
            console.log(`[PORTAL] Portal already exists`);
            return res.json({
                success: true,
                data: { portal_url: `https://${corporate.subdomain}.benefitnest.space`, message: 'Portal already exists' }
            });
        }

        // Generate and save portal
        const portalHTML = generatePortalHTML(corporate);
        fs.writeFileSync(portalPath, portalHTML, 'utf8');
        console.log(`[PORTAL] Portal created at: ${portalPath}`);

        // Update database
        await supabase
            .from('tenants')
            .update({ portal_created_at: new Date().toISOString() })
            .eq('tenant_id', tenantId);

        // Log activity
        await supabase.from('corporate_activity_log').insert({
            tenant_id: tenantId,
            activity_type: 'PORTAL_CREATED',
            description: `Portal created for subdomain: ${corporate.subdomain}`,
            entity_type: 'PORTAL'
        }).catch(() => {});

        res.json({
            success: true,
            data: {
                portal_url: `https://${corporate.subdomain}.benefitnest.space`,
                subdomain: corporate.subdomain
            }
        });
    } catch (err) {
        console.error('[PORTAL] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to create portal' });
    }
});

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
