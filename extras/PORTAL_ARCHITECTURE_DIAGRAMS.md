# Portal Creation System - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BENEFITNEST PLATFORM                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         FRONTEND (Next.js)                             │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │     Corporate Management Page                                    │ │ │
│  │  │                                                                  │ │ │
│  │  │  [Edit] [View] [Delete] [Open] ← Click "Open" Button            │ │ │
│  │  │                                    │                            │ │ │
│  │  │                                    ↓                            │ │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐   │ │ │
│  │  │  │  checkAndOpenPortal()                                   │   │ │ │
│  │  │  │  ┌────────────────────────────────────────────────────┐ │   │ │ │
│  │  │  │  │ 1. GET /check-portal                              │ │   │ │ │
│  │  │  │  │    (Check if portal exists)                       │ │   │ │ │
│  │  │  │  │        ↓                                          │ │   │ │ │
│  │  │  │  │ 2. If exists: Open URL                            │ │   │ │ │
│  │  │  │  │    If not: Show prompt                            │ │   │ │ │
│  │  │  │  │        ↓                                          │ │   │ │ │
│  │  │  │  │ 3. If OK: POST /create-portal                     │ │   │ │ │
│  │  │  │  │    (Create new portal)                            │ │   │ │ │
│  │  │  │  │        ↓                                          │ │   │ │ │
│  │  │  │  │ 4. Wait 1 second                                  │ │   │ │ │
│  │  │  │  │        ↓                                          │ │   │ │ │
│  │  │  │  │ 5. Open portal URL in new tab                     │ │   │ │ │
│  │  │  │  └────────────────────────────────────────────────────┘ │   │ │ │
│  │  │  └──────────────────────────────────────────────────────────┘   │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    ↕                                        │
│                         HTTP/REST API                                      │
│                                    ↕                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      BACKEND (Express.js)                              │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Portal Routes (portal.routes.js)                                │ │ │
│  │  │                                                                  │ │ │
│  │  │  GET /api/admin/corporates/:tenantId/check-portal              │ │ │
│  │  │  ├─ Get corporate data from DB                                 │ │ │
│  │  │  ├─ Check if file exists: backend/portals/{subdomain}.html    │ │ │
│  │  │  └─ Return: { portal_exists: true/false }                     │ │ │
│  │  │                                                                  │ │ │
│  │  │  POST /api/admin/corporates/:tenantId/create-portal            │ │ │
│  │  │  ├─ Get corporate data from DB                                 │ │ │
│  │  │  ├─ Generate HTML with branding                                │ │ │
│  │  │  ├─ Write file: backend/portals/{subdomain}.html              │ │ │
│  │  │  ├─ Update DB: portal_created_at timestamp                    │ │ │
│  │  │  ├─ Log activity to corporate_activity_log                    │ │ │
│  │  │  └─ Return: { portal_url }                                    │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                    ↕                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Data Sources                                                    │ │ │
│  │  │                                                                  │ │ │
│  │  │  Database (Supabase)                                            │ │ │
│  │  │  ├─ tenants table (corporate data)                             │ │ │
│  │  │  └─ corporate_activity_log table                               │ │ │
│  │  │                                                                  │ │ │
│  │  │  File System                                                    │ │ │
│  │  │  └─ backend/portals/                                           │ │ │
│  │  │     ├─ kind.html                                               │ │ │
│  │  │     ├─ acme-corp.html                                          │ │ │
│  │  │     └─ ...                                                      │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
CLIENT REQUEST
     │
     ├─ "Open" button clicked
     │
     ↓
FRONTEND (CorporateManagement.jsx)
     │
     ├─ corporateId = "560aa04b-d137-4e32-898c-0d611fda0c24"
     │
     ↓
API CALL 1: GET /check-portal
     │
     ↓
BACKEND (portal.routes.js)
     │
     ├─ Query DB for corporate
     │  ├─ Found? Continue
     │  └─ Not found? Return 404
     │
     ├─ Check file exists
     │  ├─ fs.existsSync('backend/portals/kind.html')
     │  └─ Return portal_exists: true/false
     │
     ↓
RESPONSE 1: { portal_exists: true/false }
     │
     ↓
FRONTEND (Decision Logic)
     │
     ├─ If portal_exists === true
     │  ├─ Open URL in new tab
     │  └─ Done ✓
     │
     └─ If portal_exists === false
        │
        ├─ Show confirm dialog
        │  "Create portal now?"
        │
        └─ If user clicks OK
           │
           ↓
        API CALL 2: POST /create-portal
           │
           ↓
        BACKEND (portal.routes.js)
           │
           ├─ Query DB for corporate
           │
           ├─ Generate Portal HTML
           │  └─ generatePortalHTML(corporate)
           │     ├─ Insert company name
           │     ├─ Insert branding colors
           │     ├─ Insert logo URL
           │     └─ Return HTML string
           │
           ├─ Write File
           │  └─ fs.writeFileSync(
           │       'backend/portals/kind.html',
           │       portalHTML
           │     )
           │
           ├─ Update Database
           │  └─ UPDATE tenants
           │     SET portal_created_at = NOW()
           │     WHERE tenant_id = '560aa04b...'
           │
           ├─ Log Activity
           │  └─ INSERT corporate_activity_log
           │     { activity_type: 'PORTAL_CREATED' }
           │
           ↓
        RESPONSE 2: { portal_url, success: true }
           │
           ↓
        FRONTEND
           │
           ├─ Show toast: "Portal created successfully!"
           ├─ Wait 1 second (for backend to stabilize)
           ├─ Open URL in new tab
           └─ Done ✓
```

---

## File System State Diagram

```
BEFORE CLICKING "OPEN":
└── backend/
    ├── portals/          (empty)
    └── corporates.routes.js

USER CLICKS "OPEN":
└── backend/
    ├── portals/
    │   └── kind.html     ← CREATED
    └── corporates.routes.js

DATABASE BEFORE:
└── tenants table
    ├── tenant_id: "560aa04b-d137-4e32-898c-0d611fda0c24"
    ├── subdomain: "kind"
    ├── corporate_legal_name: "Kind Healthcare"
    └── portal_created_at: NULL

DATABASE AFTER:
└── tenants table
    ├── tenant_id: "560aa04b-d137-4e32-898c-0d611fda0c24"
    ├── subdomain: "kind"
    ├── corporate_legal_name: "Kind Healthcare"
    ├── portal_created_at: "2025-12-27T12:00:00Z"  ← UPDATED
    └── portal_file: "kind.html"                   ← UPDATED
```

---

## Portal HTML Generation

```
generatePortalHTML(corporate)
        │
        ├─ Extract company data
        │  ├─ corporate_legal_name
        │  ├─ subdomain
        │  ├─ branding_config.primary_color
        │  ├─ branding_config.secondary_color
        │  └─ logo_url
        │
        ├─ Build HTML template
        │  ├─ DOCTYPE declaration
        │  ├─ <head>
        │  │  ├─ Title: "{Company} - Employee Benefits Portal"
        │  │  └─ Style: CSS with company colors
        │  ├─ <body>
        │  │  ├─ Logo container
        │  │  ├─ Company name
        │  │  ├─ "Coming Soon" badge
        │  │  ├─ Features list
        │  │  └─ Action buttons
        │  └─ </html>
        │
        └─ Return HTML string
           └─ Save to backend/portals/{subdomain}.html
```

---

## Error Handling Flow

```
checkAndOpenPortal()
        │
        ├─ TRY: GET /check-portal
        │  ├─ SUCCESS: portal_exists = true
        │  │  └─ Open URL
        │  │
        │  ├─ SUCCESS: portal_exists = false
        │  │  ├─ Confirm("Create portal?")
        │  │  │
        │  │  ├─ YES
        │  │  │  ├─ TRY: POST /create-portal
        │  │  │  │  ├─ SUCCESS
        │  │  │  │  │  ├─ Show toast "Portal created!"
        │  │  │  │  │  ├─ Wait 1 second
        │  │  │  │  │  └─ Open URL
        │  │  │  │  │
        │  │  │  │  └─ ERROR
        │  │  │  │     ├─ Log to console
        │  │  │  │     └─ Fallback: Open URL anyway
        │  │  │  │
        │  │  │  └─ NO: Cancel
        │  │  │
        │  │  └─ CANCEL
        │  │
        │  └─ ERROR
        │     └─ Fallback: Open URL directly
        │
        └─ CATCH: Generic error
           ├─ Log error
           └─ Fallback: Open URL directly
```

---

## Database Integration

```
Supabase
    │
    ├─ Table: tenants
    │  ├── tenant_id (UUID) - Primary Key
    │  ├── subdomain (VARCHAR) - Portal identifier
    │  ├── corporate_legal_name (VARCHAR)
    │  ├── branding_config (JSONB)
    │  │   ├─ primary_color
    │  │   ├─ secondary_color
    │  │   └─ logo_url
    │  ├── logo_url (VARCHAR)
    │  ├── portal_created_at (TIMESTAMP) ← NEW
    │  └── portal_file (VARCHAR) ← NEW
    │
    └─ Table: corporate_activity_log
       ├── activity_id (UUID) - Primary Key
       ├── tenant_id (UUID) - Foreign Key
       ├── activity_type (VARCHAR) = 'PORTAL_CREATED'
       ├── description (TEXT) = 'Portal created for subdomain: kind'
       ├── entity_type (VARCHAR) = 'PORTAL'
       ├── entity_id (VARCHAR) = 'kind.html'
       └── created_at (TIMESTAMP)
```

---

## State Management

```
Component State (CorporateManagement.jsx)
    │
    ├─ showForm: boolean
    ├─ selectedCorporate: object
    │  └─ { tenant_id, subdomain, corporate_legal_name, ... }
    │
    └─ On "Open" click:
       └─ checkAndOpenPortal(corporate)
          ├─ Makes API calls
          ├─ Shows toasts
          └─ Opens new window

API Response State
    │
    ├─ Check Portal Response
    │  └─ { success: true, data: { portal_exists, portal_url } }
    │
    ├─ Create Portal Response
    │  └─ { success: true, data: { portal_url, subdomain } }
    │
    └─ Error Response
       └─ { success: false, message: "..." }

Toast Notifications
    │
    ├─ Success: "Portal created successfully!"
    ├─ Error: "Failed to create portal"
    └─ Info: (automatic, no action needed)
```

---

## Deployment Architecture

```
PRODUCTION SETUP:
┌─────────────────────────────────────────────────────────┐
│                       Internet                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          DNS Configuration                         │ │
│  │  *.benefitnest.space → CDN / Load Balancer        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ↓                ↓                ↓
┌──────────┐  ┌──────────┐  ┌──────────────┐
│Frontend  │  │Backend   │  │File Server   │
│(Vercel)  │  │(Express) │  │(nginx/CDN)   │
└──────────┘  └──────────┘  └──────────────┘
                     │
                     ↓
              ┌──────────────┐
              │  Supabase    │
              │  (Database)  │
              └──────────────┘
```

---

**Diagram Version:** 1.0.0
**Last Updated:** December 27, 2025
