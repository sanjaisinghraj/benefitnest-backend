-- =====================================================
-- ADD PORTAL FIELDS TO TENANTS TABLE
-- =====================================================
-- These fields track the employee portal URL and creation timestamp
-- Run this in your Supabase SQL Editor

-- Add portal_url column if it doesn't exist
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- Add portal_created_at column if it doesn't exist
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS portal_created_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN tenants.portal_url IS 'The URL of the employee portal for this corporate';
COMMENT ON COLUMN tenants.portal_created_at IS 'Timestamp when the employee portal was created for this corporate';

-- Create index for faster portal queries
CREATE INDEX IF NOT EXISTS idx_tenants_portal_created_at ON tenants(portal_created_at);

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
  AND column_name IN ('portal_url', 'portal_created_at')
ORDER BY column_name;
