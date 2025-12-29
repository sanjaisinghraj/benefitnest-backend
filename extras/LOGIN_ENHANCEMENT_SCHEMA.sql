-- =====================================================
-- LOGIN ENHANCEMENT SCHEMA UPDATE
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add OTP and password reset columns to portal_testers table
ALTER TABLE portal_testers
ADD COLUMN IF NOT EXISTS login_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS login_otp_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(6),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Index for faster lookups on portal_testers
CREATE INDEX IF NOT EXISTS idx_portal_testers_email ON portal_testers(email);
CREATE INDEX IF NOT EXISTS idx_portal_testers_phone ON portal_testers(phone);
CREATE INDEX IF NOT EXISTS idx_portal_testers_tenant ON portal_testers(tenant_id);

-- =====================================================
-- ACTIVITY LOGS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(tenant_id),
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(100),
    description TEXT,
    performed_by UUID,
    performed_by_type VARCHAR(50),
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN portal_testers.login_otp IS 'One-time password for OTP-based login';
COMMENT ON COLUMN portal_testers.login_otp_expires IS 'Expiry timestamp for login OTP';
COMMENT ON COLUMN portal_testers.reset_token IS 'Password reset verification code';
COMMENT ON COLUMN portal_testers.reset_token_expires IS 'Expiry timestamp for reset token';
