# Dynamic TSX Portal Setup Guide

## Overview

The portal system has been upgraded from **Static HTML** to **Dynamic TSX React Components** with the following benefits:

✅ Full React component support  
✅ State management & hooks  
✅ Real-time data updates  
✅ Employee authentication integration  
✅ Responsive design with React  
✅ Easy customization  
✅ No file storage needed (config from database)

---

## Architecture

```
User visits: subdomain.benefitnest.space
        ↓
Next.js Dynamic Route: app/[subdomain]/page.tsx
        ↓
Fetches from Backend: /api/portal/config/{subdomain}
        ↓
Backend queries tenants table (no file storage)
        ↓
Returns portal config JSON
        ↓
React component renders with company branding
```

---

## How It Works

### 1. Portal Creation Flow

**Admin clicks "Open" button:**
1. Backend checks if `portal_created_at` is set
2. If not, sets `portal_created_at` timestamp
3. Updates database (NO FILE GENERATION)
4. Logs activity
5. Returns success

**No HTML files are created!** Configuration lives in the database.

### 2. Portal Access Flow

**User visits `kind.benefitnest.space`:**
1. Next.js matches dynamic route `[subdomain]`
2. Page component calls API: `/api/portal/config/kind`
3. Backend fetches from tenants table where subdomain='kind'
4. Returns JSON config:
   ```json
   {
     "tenant_id": "123",
     "company_name": "Kind Healthcare",
     "subdomain": "kind",
     "logo_url": "...",
     "primary_color": "#2563eb",
     "secondary_color": "#10b981",
     "address": {...},
     "contact_email": "...",
     "contact_phone": "...",
     "status": "active"
   }
   ```
5. React component renders with data
6. User sees branded portal

---

## Backend Changes

### New Endpoint: `GET /api/portal/config/{subdomain}`

**Purpose:** Fetch portal configuration for TSX rendering

**Request:**
```
GET /api/portal/config/kind
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant_id": "123",
    "company_name": "Kind Healthcare",
    "subdomain": "kind",
    "logo_url": "https://...",
    "primary_color": "#2563eb",
    "secondary_color": "#10b981",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001"
    },
    "contact_email": "support@kind.com",
    "contact_phone": "+1-555-0123",
    "status": "active",
    "created_at": "2025-12-27T..."
  }
}
```

### Updated Endpoint: `POST /api/admin/corporates/{tenantId}/create-portal`

**Changes:**
- No longer uploads HTML to storage
- Only sets `portal_created_at` timestamp in database
- Returns success response

---

## Frontend Changes

### New Dynamic Route: `app/[subdomain]/page.tsx`

**Features:**
- Detects subdomain from URL
- Fetches portal config from API
- Renders with React hooks
- Displays 3 tabs: Overview, Features, Contact
- Responsive design
- Error handling
- Loading states

**Components:**
1. **PortalPage** - Main page component (handles routing)
2. **PortalContent** - Content renderer with tabs
3. **Tab System** - Overview, Features, Contact

**Customizable Elements:**
- Colors (from `branding_config`)
- Logo (from `logo_url`)
- Company name (from `corporate_legal_name`)
- Contact info (from database)
- Address info (from address column)

---

## Database Configuration

No new tables needed! Uses existing `tenants` columns:

| Column | Purpose |
|--------|---------|
| `tenant_id` | Unique tenant ID |
| `subdomain` | Portal subdomain |
| `corporate_legal_name` | Company name display |
| `logo_url` | Company logo |
| `branding_config` | Colors (JSON) |
| `address` | Address info (JSON) |
| `contact_details` | Email/phone (JSON) |
| `portal_created_at` | Portal creation flag |
| `status` | Active/inactive |

---

## Testing

### Test 1: Create Portal
1. Go to Admin → Corporate Management
2. Click Edit on a corporate
3. Click "Open" button
4. Should create portal and open subdomain page

### Test 2: Access Portal
1. Visit: `http://localhost:3000/kind` (local)
2. Should render portal with company branding
3. Tabs should be clickable
4. Features should display correctly

### Test 3: Verify Configuration
1. Supabase Dashboard → Editor → Query:
   ```sql
   SELECT tenant_id, subdomain, portal_created_at 
   FROM tenants 
   WHERE subdomain = 'kind';
   ```
2. Should show `portal_created_at` timestamp

---

## Environment Variables

Add to `.env.local` (frontend):
```
NEXT_PUBLIC_API_URL=http://localhost:10000  # local
# OR for production:
# NEXT_PUBLIC_API_URL=https://benefitnest-backend.onrender.com
```

---

## Customization Guide

### Change Portal Colors

Option 1: Admin Panel
1. Edit corporate in Admin
2. Update `branding_config.primary_color` and `secondary_color`
3. Save
4. Portal automatically uses new colors

Option 2: Database
```sql
UPDATE tenants 
SET branding_config = jsonb_set(
  branding_config, 
  '{primary_color}', 
  '"#ff6b6b"'
)
WHERE subdomain = 'kind';
```

### Add Custom Sections

Edit `PortalContent` component in `app/[subdomain]/page.tsx`:
1. Add new tab to `activeTab` state
2. Add button in tab navigation
3. Add content in switch/if statement
4. Deploy

### Add Employee Login

```tsx
// Add this after fetching portal config
const [user, setUser] = useState(null);
const [isLoggedIn, setIsLoggedIn] = useState(false);

// Render login form if not logged in
if (!isLoggedIn) {
  return <PortalLoginForm onLogin={setUser} />;
}

// Show portal if logged in
return <PortalContent config={portalConfig} user={user} />;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 Portal not found | Check `portal_created_at` is set in database |
| No branding colors | Verify `branding_config` JSON has `primary_color` |
| Logo not showing | Check `logo_url` is valid/public URL |
| API 500 error | Check backend is running on correct port |
| Subdomain not resolving | Configure DNS wildcard (*.benefitnest.space) |

---

## Production Deployment

### DNS Setup
```
*.benefitnest.space  A  YOUR_SERVER_IP
```

### Vercel (if hosting frontend)
1. Add domain to Vercel project
2. Configure wildcard: `*.benefitnest.space`
3. Deploy

### Render (backend)
1. Environment variables configured
2. Supabase connection working
3. API endpoints accessible

### Testing Production
```
# Visit portal for a corporate with subdomain 'kind'
https://kind.benefitnest.space
```

---

## Performance Notes

✅ **Advantages:**
- No file generation overhead
- Database queries are fast
- React hydration on client
- CSS-in-JS (inline styles)
- No external assets needed

⏱️ **Performance Tips:**
- Add caching headers for API responses
- Cache corporate data in Redis
- Use CDN for logo images
- Optimize branding colors

---

## Next Steps

1. **Test locally** - Verify portal creation and display
2. **Deploy to production** - Push code and configure DNS
3. **Add employee features** - Login, dashboard, claims
4. **Customize design** - Adjust colors, layout, sections
5. **Monitor usage** - Track portal analytics

---

**Setup Complete!** ✅ Your dynamic TSX portal system is ready to use.

For more help, see:
- `PORTAL_CODE_EXAMPLES.md` - Code customization examples
- `START_HERE.md` - Quick start guide
- `backend/routes/portal.routes.js` - API implementation
- `frontend/app/[subdomain]/page.tsx` - Frontend component
