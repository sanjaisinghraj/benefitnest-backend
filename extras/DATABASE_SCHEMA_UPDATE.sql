-- =====================================================
-- PORTAL FEATURE - Database Schema Update
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add portal tracking columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_created_at TIMESTAMP DEFAULT NULL;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_file VARCHAR(255);

-- Optional: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_portal_created_at ON tenants(portal_created_at);

-- Portal Configuration Notes:
-- Portal config is now fetched from the tenants table directly
-- No separate portal_config table needed - all data is in tenants
-- When TSX portal is requested, backend returns:
-- - company_name (from corporate_legal_name)
-- - logo_url (from logo_url column)
-- - primary_color, secondary_color (from branding_config JSON)
-- - address, contact info (from respective columns)

-- Verify columns were added
-- SELECT * FROM information_schema.columns WHERE table_name = 'tenants' AND column_name LIKE 'portal%';
