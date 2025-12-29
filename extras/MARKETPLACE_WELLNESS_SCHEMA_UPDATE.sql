-- =====================================================
-- MARKETPLACE & WELLNESS SETTINGS SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add marketplace_settings column to portal_customizations table
ALTER TABLE portal_customizations 
ADD COLUMN IF NOT EXISTS marketplace_settings JSONB DEFAULT NULL;

-- Add wellness_settings column to portal_customizations table
ALTER TABLE portal_customizations 
ADD COLUMN IF NOT EXISTS wellness_settings JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN portal_customizations.marketplace_settings IS 'JSON configuration for marketplace feature per tenant';
COMMENT ON COLUMN portal_customizations.wellness_settings IS 'JSON configuration for wellness feature per tenant';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_portal_customizations_marketplace 
ON portal_customizations USING GIN (marketplace_settings);

CREATE INDEX IF NOT EXISTS idx_portal_customizations_wellness 
ON portal_customizations USING GIN (wellness_settings);

-- =====================================================
-- EXAMPLE: Default marketplace_settings structure
-- =====================================================
/*
{
    "enabled": true,
    "title": "Employee Marketplace",
    "headline": "Shop for wellness products and services",
    "showSearch": true,
    "showWallet": true,
    "showCart": true,
    "showWishlist": true,
    "showNotifications": true,
    "showHeroBanner": true,
    "showPromotionalBanners": true,
    "showCategoryGrid": true,
    "showDealOfMonth": true,
    "showFeaturedProducts": true,
    "showNewArrivals": true,
    "showBestSellers": true,
    "showTopVendors": true,
    "showNewsletter": true,
    "showFooter": true,
    "walletInitialBalance": 500,
    "walletCurrency": "Points",
    "showTransactionHistory": true,
    "primaryColor": "#2563eb",
    "secondaryColor": "#10b981",
    "accentColor": "#f59e0b",
    "borderRadius": 8
}
*/

-- =====================================================
-- EXAMPLE: Default wellness_settings structure
-- =====================================================
/*
{
    "enabled": true,
    "title": "Wellness Hub",
    "showHealthRiskAssessment": true,
    "showAICoach": true,
    "showFitnessTracker": true,
    "showMentalHealth": true,
    "showNutrition": true,
    "showSleepTracker": true
}
*/

-- =====================================================
-- VERIFY: Check columns were added
-- =====================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'portal_customizations'
AND column_name IN ('marketplace_settings', 'wellness_settings');
