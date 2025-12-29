-- =====================================================
-- LOGIN PAGE TOGGLES - Add to portal_customizations table
-- Run in Supabase SQL Editor
-- =====================================================

-- Add login page toggle columns to portal_customizations table
ALTER TABLE portal_customizations 
ADD COLUMN IF NOT EXISTS show_consent_checkbox BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_privacy_link BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_terms_link BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_disclaimer_link BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_remember_me BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_forgot_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_login_method_selector BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_otp_login BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN portal_customizations.show_consent_checkbox IS 'Show consent checkbox on login page';
COMMENT ON COLUMN portal_customizations.show_privacy_link IS 'Show privacy policy link on login page';
COMMENT ON COLUMN portal_customizations.show_terms_link IS 'Show terms & conditions link on login page';
COMMENT ON COLUMN portal_customizations.show_disclaimer_link IS 'Show disclaimer link on login page';
COMMENT ON COLUMN portal_customizations.show_remember_me IS 'Show remember me checkbox on login page';
COMMENT ON COLUMN portal_customizations.show_forgot_password IS 'Show forgot password link on login page';
COMMENT ON COLUMN portal_customizations.show_login_method_selector IS 'Show login method dropdown (Email/Mobile/Employee ID)';
COMMENT ON COLUMN portal_customizations.enable_otp_login IS 'Enable OTP-based login option';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'portal_customizations' 
AND column_name IN (
    'show_consent_checkbox', 'show_privacy_link', 'show_terms_link', 
    'show_disclaimer_link', 'show_remember_me', 'show_forgot_password',
    'show_login_method_selector', 'enable_otp_login'
)
ORDER BY column_name;
