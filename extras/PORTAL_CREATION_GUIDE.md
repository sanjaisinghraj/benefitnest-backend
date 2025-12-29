# Portal Creation Implementation Guide

## Overview
When a user clicks the "Open" button for a corporate, the system should:
1. Check if a portal exists for that subdomain
2. If not, create one and save it
3. Open the portal in a new tab

## Backend Architecture

### Option 1: Static File-Based Portals (Recommended for Simplicity)
Store portal HTML files in a `portals` folder and serve them via Express static middleware.

**Folder Structure:**
```
backend/
├── portals/
│   ├── subdomain1.html
│   ├── subdomain2.html
│   └── ...
├── portal-template.html
├── routes/
│   └── portal.routes.js
└── index.js
```

### Option 2: Dynamic Route-Based Portals (Recommended for Scalability)
Use Next.js dynamic routing or Express middleware to serve portals on-demand.

---

## Implementation Steps

### Step 1: Create Portal Routes (`backend/routes/portal.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const PORTALS_DIR = path.join(__dirname, '../portals');

// Ensure portals directory exists
if (!fs.existsSync(PORTALS_DIR)) {
    fs.mkdirSync(PORTALS_DIR, { recursive: true });
}

// =====================================================
// CHECK IF PORTAL EXISTS
// =====================================================
router.get('/:tenantId/check-portal', async (req, res) => {
    try {
        const { tenantId } = req.params;

        // Get corporate data
        const { data: corporate, error } = await supabase
            .from('tenants')
            .select('subdomain, corporate_legal_name')
            .eq('tenant_id', tenantId)
            .single();

        if (error || !corporate) {
            return res.status(404).json({ 
                success: false, 
                message: 'Corporate not found' 
            });
        }

        const portalFileName = `${corporate.subdomain}.html`;
        const portalPath = path.join(PORTALS_DIR, portalFileName);
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
        console.error('Error checking portal:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check portal' 
        });
    }
});

// =====================================================
// CREATE PORTAL
// =====================================================
router.post('/:tenantId/create-portal', async (req, res) => {
    try {
        const { tenantId } = req.params;

        // Get corporate data
        const { data: corporate, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        if (error || !corporate) {
            return res.status(404).json({ 
                success: false, 
                message: 'Corporate not found' 
            });
        }

        const subdomain = corporate.subdomain;
        const portalFileName = `${subdomain}.html`;
        const portalPath = path.join(PORTALS_DIR, portalFileName);

        // Check if already exists
        if (fs.existsSync(portalPath)) {
            return res.json({
                success: true,
                data: {
                    portal_url: `https://${subdomain}.benefitnest.space`,
                    message: 'Portal already exists'
                }
            });
        }

        // Generate portal HTML with company branding
        const portalHTML = generatePortalHTML(corporate);

        // Save portal file
        fs.writeFileSync(portalPath, portalHTML, 'utf8');

        // Log the activity
        await supabase.from('corporate_activity_log').insert({
            tenant_id: tenantId,
            activity_type: 'PORTAL_CREATED',
            description: `Portal created for subdomain: ${subdomain}`,
            entity_type: 'PORTAL',
            performed_by_type: 'SYSTEM'
        });

        res.json({
            success: true,
            data: {
                portal_url: `https://${subdomain}.benefitnest.space`,
                portal_file: portalFileName
            }
        });
    } catch (err) {
        console.error('Error creating portal:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create portal' 
        });
    }
});

// =====================================================
// HELPER: Generate Portal HTML
// =====================================================
function generatePortalHTML(corporate) {
    const {
        corporate_legal_name,
        branding_config = {},
        logo_url
    } = corporate;

    const primaryColor = branding_config.primary_color || '#2563eb';
    const secondaryColor = branding_config.secondary_color || '#10b981';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${corporate_legal_name} - Employee Benefits Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            border-radius: 12px;
            background: ${primaryColor}15;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        h1 {
            font-size: 28px;
            color: #111827;
            margin-bottom: 12px;
        }
        
        .company-name {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 32px;
        }
        
        .coming-soon {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 14px;
            color: #92400e;
        }
        
        .features {
            text-align: left;
            margin: 24px 0;
            padding: 24px;
            background: #f3f4f6;
            border-radius: 8px;
        }
        
        .features h3 {
            font-size: 14px;
            color: #374151;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .features ul {
            list-style: none;
        }
        
        .features li {
            padding: 8px 0;
            color: #4b5563;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .features li:before {
            content: "✓";
            color: ${primaryColor};
            font-weight: bold;
        }
        
        .button {
            background: ${primaryColor};
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 16px;
        }
        
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            ${logo_url ? `<img src="${logo_url}" alt="${corporate_legal_name}">` : '🏢'}
        </div>
        
        <h1>Welcome</h1>
        <p class="company-name">${corporate_legal_name}</p>
        
        <div class="coming-soon">
            ⚠️ Portal is under development. Coming soon!
        </div>
        
        <div class="features">
            <h3>Employee Benefits Portal</h3>
            <ul>
                <li>View benefits and claims</li>
                <li>Manage personal information</li>
                <li>Download documents</li>
                <li>Track policy details</li>
            </ul>
        </div>
        
        <button class="button" onclick="location.href='https://www.benefitnest.space'">
            Go to Main Site
        </button>
        
        <footer>
            <p>Powered by BenefitNest © ${new Date().getFullYear()}</p>
        </footer>
    </div>
</body>
</html>`;
}

module.exports = router;
```

---

### Step 2: Update Backend Index.js

Add this to `backend/index.js`:

```javascript
// Add static file serving for portals
app.use('/portals', express.static(path.join(__dirname, 'portals')));

// Add portal routes
const portalRoutes = require('./routes/portal.routes');
app.use('/api/admin/corporates', portalRoutes); // This registers the check-portal and create-portal endpoints
```

---

### Step 3: Set Up Subdomain Routing (Frontend)

For serving portals on subdomain URLs like `kind.benefitnest.space`, you have options:

#### Option A: Using Vercel or Netlify
Configure wildcard DNS and route all subdomains to your portal app.

**DNS Record:**
```
*.benefitnest.space  CNAME  your-domain.vercel.app
```

**Next.js middleware** (already exists) or similar can route based on subdomain.

#### Option B: Using Nginx/Reverse Proxy
```nginx
server {
    server_name ~^(?<subdomain>.+)\.benefitnest\.space$;
    
    location / {
        proxy_pass http://localhost:3000/?tenant=$subdomain;
    }
}
```

#### Option C: Docker Compose with Virtual Hosts
Use Traefik or similar to route subdomains.

---

### Step 4: Update Supabase Table Schema

Add a column to track portal creation:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_created_at TIMESTAMP DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_file VARCHAR(255);
```

---

## Frontend Changes (Already Updated)

The frontend now has better error handling:
- ✅ Checks if portal exists via API
- ✅ Prompts to create if it doesn't
- ✅ Falls back to opening URL directly
- ✅ Shows proper success/error messages

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/corporates/:tenantId/check-portal` | Check if portal exists |
| POST | `/api/admin/corporates/:tenantId/create-portal` | Create new portal |

---

## Testing Checklist

- [ ] Create a new corporate record
- [ ] Click "Open" button
- [ ] System should prompt to create portal
- [ ] Portal HTML file should be saved to `backend/portals/{subdomain}.html`
- [ ] Subdomain portal page should open
- [ ] Branding should match corporate colors/logo
- [ ] Click "Open" again - should open directly without creating again

---

## Security Notes

1. **Verify tenant ownership** before creating portals
2. **Sanitize subdomain names** to prevent path traversal attacks
3. **Rate limit** portal creation to prevent abuse
4. **Validate tenant exists** in database before file creation
5. **Use HTTPS only** for subdomain portals

---

## Future Enhancements

1. **Dynamic content loading**: Fetch employee data from API and display on portal
2. **Portal customization**: Allow tenants to customize portal appearance
3. **User authentication**: Implement SSO or login for employees
4. **Document management**: Let employees download benefits documents
5. **Claims tracking**: Show status of submitted claims
6. **Push notifications**: Notify employees of policy updates

