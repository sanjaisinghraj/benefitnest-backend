# Portal Creation Feature - Implementation Complete ✅

## What's Been Done

### Frontend Updates (CorporateManagement.jsx)
✅ Improved `checkAndOpenPortal()` function with:
- Better error handling and fallbacks
- Progressive retry logic
- Proper success/error toast notifications
- 1-second delay before opening portal (allows backend to prepare)

### Backend Updates (portal.routes.js)
✅ Added two new endpoints:
1. **`GET /api/admin/corporates/:tenantId/check-portal`**
   - Checks if portal HTML file exists
   - Returns portal URL and subdomain
   - No database changes

2. **`POST /api/admin/corporates/:tenantId/create-portal`**
   - Generates portal HTML with company branding
   - Saves to `backend/portals/{subdomain}.html`
   - Updates tenant record with `portal_created_at` timestamp
   - Logs activity to `corporate_activity_log` table

---

## How It Works

### User Flow
1. User clicks "Open" button on a corporate record
2. Frontend calls `GET /api/admin/corporates/:tenantId/check-portal`
3. If portal exists → Opens it in new tab
4. If portal doesn't exist → Prompts user: "Create portal now?"
5. If yes → Backend creates HTML file and saves to disk
6. Portal opens with company branding (colors + logo)

### File Structure
```
backend/
├── portals/                    ← NEW FOLDER
│   ├── kind.html              ← Portal file for "kind" subdomain
│   ├── acme-corp.html
│   └── ...
├── routes/
│   └── portal.routes.js        ← Updated with check/create endpoints
└── index.js                    ← Already configured
```

---

## Setup Instructions

### Step 1: Create Portals Directory
```bash
cd backend
mkdir -p portals
chmod 755 portals
```

### Step 2: Update Supabase Schema (Optional but Recommended)
Add columns to track portal creation:

```sql
-- Add portal tracking columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_created_at TIMESTAMP DEFAULT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_file VARCHAR(255) DEFAULT NULL;
```

### Step 3: Restart Backend
```bash
npm start
# or
node index.js
```

### Step 4: Test the Feature

**Test in Admin Panel:**
1. Go to Corporate Management page
2. Click "Edit" on any corporate record
3. Click "Skip & Update Anyway" (if AI validation shows)
4. Close the form
5. Click "Open" button on the corporate row
6. Should prompt: "Portal doesn't exist for {company}. Create it now?"
7. Click OK to create
8. Wait 1 second and new tab opens with portal

**Verify Portal File Created:**
```bash
ls -la backend/portals/
# Should see: kind.html (or whatever subdomain)
```

**Verify Database Updated:**
```sql
SELECT tenant_id, subdomain, portal_created_at, portal_file 
FROM tenants 
WHERE subdomain = 'kind';
```

---

## Portal Features

### Current (Basic Landing Page)
- Company logo/branding colors
- "Coming Soon" message
- List of planned features
- Link to main BenefitNest site
- Responsive design

### Future Enhancements
- Employee login form
- Dashboard with benefits info
- Claim submission
- Document downloads
- Policy details

---

## Subdomain Routing Setup

For portals to be accessible at `https://kind.benefitnest.space`, you need to set up DNS and hosting:

### Option 1: Vercel (Recommended for Next.js)
No additional setup needed if your frontend is on Vercel. The wildcard DNS handles subdomains automatically.

### Option 2: Self-Hosted with Nginx
```nginx
server {
    server_name ~^(?<subdomain>.+)\.benefitnest\.space$;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Subdomain $subdomain;
    }
}
```

### Option 3: Cloudflare Workers
Create a worker to route subdomains to your portal frontend.

---

## API Response Examples

### Check Portal - Exists
```json
{
  "success": true,
  "data": {
    "portal_exists": true,
    "portal_url": "https://kind.benefitnest.space",
    "subdomain": "kind"
  }
}
```

### Check Portal - Doesn't Exist
```json
{
  "success": true,
  "data": {
    "portal_exists": false,
    "portal_url": "https://kind.benefitnest.space",
    "subdomain": "kind"
  }
}
```

### Create Portal - Success
```json
{
  "success": true,
  "data": {
    "portal_url": "https://kind.benefitnest.space",
    "subdomain": "kind"
  }
}
```

---

## Security Considerations

✅ **Already Handled:**
- Tenant verification (must exist in database)
- Auth middleware on admin endpoints
- Subdomain sanitization
- File system validation

⚠️ **Additional Recommendations:**
```javascript
// Add rate limiting
app.post('/api/admin/corporates/:tenantId/create-portal', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5 // 5 requests per hour
}), createPortalHandler);

// Add size limits
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
if (portalHTML.length > MAX_FILE_SIZE) {
  throw new Error('Portal HTML exceeds size limit');
}

// Validate HTML before writing
const htmlValidator = require('html-validator');
const isValid = await htmlValidator.validate({ html: portalHTML });
if (!isValid) throw new Error('Invalid HTML generated');
```

---

## Troubleshooting

### Portal Not Created
1. Check `backend/portals/` folder exists and is writable
2. Check backend logs for errors
3. Verify tenant exists in database
4. Check file permissions: `chmod 755 backend/portals`

### Portal Opens But Shows "Company Not Found"
1. The subdomain routing isn't set up properly
2. Frontend can't find tenant data
3. Make sure `/api/portal/tenant/{subdomain}` endpoint is working:
   ```bash
   curl https://benefitnest-backend.onrender.com/api/portal/tenant/kind
   ```

### Portal File Exists But Still Says "Create"
1. Clear browser cache
2. Verify file path matches subdomain exactly
3. Check file has readable permissions

---

## File Manifest

### Modified Files
- ✅ `frontend/app/admin/corporates/CorporateManagement.jsx` - Improved checkAndOpenPortal()
- ✅ `backend/routes/portal.routes.js` - Added check/create endpoints

### New Directories
- ✅ `backend/portals/` - Stores generated portal HTML files

### New Files
- ℹ️ `PORTAL_CREATION_GUIDE.md` - This guide

---

## Next Steps

1. ✅ Test portal creation in development
2. ⏭️ Set up subdomain DNS routing (if not using Vercel)
3. ⏭️ Customize portal template with more features
4. ⏭️ Add employee login to portal pages
5. ⏭️ Implement dashboard with benefits data
6. ⏭️ Add real-time notifications

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs: `journalctl -u benefitnest-backend`
3. Check frontend console (F12 → Console tab)
4. Verify Supabase connection and data

Generated: December 27, 2025
