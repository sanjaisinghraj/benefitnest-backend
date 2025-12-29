-- =====================================================
-- PORTAL CUSTOMIZATIONS - Enterprise Edition
-- Supports global requirements & maximum customization
-- Run in Supabase SQL Editor
-- =====================================================

-- Main Customizations Table
CREATE TABLE IF NOT EXISTS portal_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    -- ===== VERSION CONTROL =====
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_draft BOOLEAN DEFAULT false,
    
    -- ===== VISUAL IDENTITY =====
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#10b981',
    accent_color VARCHAR(7) DEFAULT '#f59e0b',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    text_color VARCHAR(7) DEFAULT '#111827',
    border_color VARCHAR(7) DEFAULT '#e5e7eb',
    
    -- Dark mode support
    dark_mode_enabled BOOLEAN DEFAULT true,
    dark_primary_color VARCHAR(7),
    dark_secondary_color VARCHAR(7),
    dark_background_color VARCHAR(7),
    dark_text_color VARCHAR(7),
    
    -- ===== TYPOGRAPHY =====
    heading_font_family VARCHAR(100) DEFAULT 'Segoe UI',
    body_font_family VARCHAR(100) DEFAULT 'Segoe UI',
    heading_font_size INT DEFAULT 32,
    subheading_font_size INT DEFAULT 24,
    body_font_size INT DEFAULT 16,
    caption_font_size INT DEFAULT 12,
    font_weight_heading INT DEFAULT 700,
    font_weight_body INT DEFAULT 400,
    line_height_multiplier DECIMAL(2,2) DEFAULT 1.6,
    letter_spacing INT DEFAULT 0,
    
    -- ===== LOGO & BRANDING =====
    logo_url TEXT,
    favicon_url TEXT,
    logo_position VARCHAR(50) DEFAULT 'top-left',
    logo_width INT DEFAULT 150,
    logo_height INT DEFAULT 60,
    logo_show_on_mobile BOOLEAN DEFAULT true,
    header_background_color VARCHAR(7),
    header_sticky BOOLEAN DEFAULT true,
    
    -- ===== LAYOUT & SPACING =====
    layout_type VARCHAR(50) DEFAULT 'standard',
    container_max_width INT DEFAULT 1200,
    container_padding_x INT DEFAULT 20,
    container_padding_y INT DEFAULT 20,
    section_gap INT DEFAULT 40,
    
    -- ===== THEME SYSTEM =====
    theme_preset VARCHAR(100),
    custom_css TEXT,
    
    -- ===== MULTI-LANGUAGE SUPPORT =====
    default_language VARCHAR(5) DEFAULT 'en',
    supported_languages TEXT[],
    language_switcher_enabled BOOLEAN DEFAULT true,
    language_switcher_position VARCHAR(50) DEFAULT 'header',
    
    -- ===== REGIONAL SETTINGS =====
    default_currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    number_format VARCHAR(20) DEFAULT 'en-US',
    
    -- ===== COMPONENT VISIBILITY =====
    show_header BOOLEAN DEFAULT true,
    show_navigation_menu BOOLEAN DEFAULT true,
    show_search_bar BOOLEAN DEFAULT true,
    show_breadcrumbs BOOLEAN DEFAULT false,
    show_hero_section BOOLEAN DEFAULT true,
    show_benefits_section BOOLEAN DEFAULT true,
    show_features_section BOOLEAN DEFAULT true,
    show_news_section BOOLEAN DEFAULT true,
    show_announcements BOOLEAN DEFAULT true,
    show_contact_section BOOLEAN DEFAULT true,
    show_faq_section BOOLEAN DEFAULT true,
    show_testimonials BOOLEAN DEFAULT false,
    show_footer BOOLEAN DEFAULT true,
    show_footer_links BOOLEAN DEFAULT true,
    show_social_media BOOLEAN DEFAULT false,
    show_employee_directory BOOLEAN DEFAULT false,
    show_org_chart BOOLEAN DEFAULT false,
    show_team_members BOOLEAN DEFAULT true,
    
    -- ===== CONTENT MANAGEMENT =====
    portal_title VARCHAR(255),
    portal_tagline VARCHAR(500),
    portal_description TEXT,
    hero_headline VARCHAR(500),
    hero_subheadline VARCHAR(500),
    hero_background_image_url TEXT,
    hero_cta_button_text VARCHAR(100),
    hero_cta_button_url TEXT,
    
    -- ===== CUSTOM SECTIONS =====
    custom_sections JSONB DEFAULT '[]'::jsonb,
    
    -- ===== NAVIGATION & MENUS =====
    custom_navigation_items JSONB DEFAULT '[]'::jsonb,
    footer_links JSONB DEFAULT '[]'::jsonb,
    social_media_links JSONB DEFAULT '{}'::jsonb,
    
    -- ===== DOCUMENTS & MEDIA =====
    documents JSONB DEFAULT '[]'::jsonb,
    resource_library_enabled BOOLEAN DEFAULT false,
    media_gallery_enabled BOOLEAN DEFAULT false,
    
    -- ===== INTERACTIVE FEATURES =====
    surveys JSONB DEFAULT '[]'::jsonb,
    polls_enabled BOOLEAN DEFAULT false,
    feedback_form_enabled BOOLEAN DEFAULT false,
    chat_widget_enabled BOOLEAN DEFAULT false,
    contact_form_enabled BOOLEAN DEFAULT true,
    
    -- ===== EMPLOYEE DIRECTORY =====
    employee_directory_enabled BOOLEAN DEFAULT false,
    show_employee_photos BOOLEAN DEFAULT true,
    show_employee_contact BOOLEAN DEFAULT true,
    show_department_filter BOOLEAN DEFAULT true,
    show_search_employees BOOLEAN DEFAULT true,
    
    -- ===== BENEFITS MANAGEMENT =====
    benefits_plans_enabled BOOLEAN DEFAULT true,
    show_benefits_comparison BOOLEAN DEFAULT true,
    show_enrollment_status BOOLEAN DEFAULT true,
    open_enrollment_message TEXT,
    open_enrollment_start_date DATE,
    open_enrollment_end_date DATE,
    
    -- ===== INTEGRATIONS =====
    sso_enabled BOOLEAN DEFAULT false,
    sso_provider VARCHAR(100),
    benefits_system_integration VARCHAR(100),
    hr_system_integration VARCHAR(100),
    custom_webhooks JSONB DEFAULT '[]'::jsonb,
    
    -- ===== COMPLIANCE & LEGAL =====
    gdpr_enabled BOOLEAN DEFAULT false,
    ccpa_enabled BOOLEAN DEFAULT false,
    show_cookie_consent BOOLEAN DEFAULT false,
    show_terms_of_service BOOLEAN DEFAULT false,
    terms_of_service_url TEXT,
    privacy_policy_url TEXT,
    data_retention_days INT DEFAULT 90,
    country_compliance JSONB DEFAULT '{}'::jsonb,
    
    -- ===== ACCESSIBILITY =====
    wcag_level VARCHAR(10) DEFAULT 'AA',
    high_contrast_mode_available BOOLEAN DEFAULT true,
    text_enlargement_enabled BOOLEAN DEFAULT true,
    screen_reader_optimized BOOLEAN DEFAULT true,
    keyboard_navigation_enabled BOOLEAN DEFAULT true,
    
    -- ===== SEO & META =====
    meta_title VARCHAR(60),
    meta_description VARCHAR(160),
    meta_keywords VARCHAR(200),
    og_image_url TEXT,
    canonical_url TEXT,
    robots_txt_rules TEXT,
    
    -- ===== ANALYTICS & TRACKING =====
    google_analytics_id VARCHAR(100),
    custom_analytics_events JSONB DEFAULT '[]'::jsonb,
    heatmap_tracking_enabled BOOLEAN DEFAULT false,
    session_recording_enabled BOOLEAN DEFAULT false,
    
    -- ===== NOTIFICATIONS & COMMUNICATION =====
    announcement_banner_enabled BOOLEAN DEFAULT false,
    announcement_banner_text TEXT,
    announcement_banner_color VARCHAR(7),
    email_notifications_enabled BOOLEAN DEFAULT true,
    push_notifications_enabled BOOLEAN DEFAULT false,
    news_feed_enabled BOOLEAN DEFAULT true,
    
    -- ===== METADATA =====
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    internal_notes TEXT,
    customization_request_id UUID,
    
    UNIQUE(tenant_id, version)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_portal_customizations_tenant_id ON portal_customizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_customizations_active ON portal_customizations(is_active);
CREATE INDEX IF NOT EXISTS idx_portal_customizations_version ON portal_customizations(version);
CREATE INDEX IF NOT EXISTS idx_portal_custom_sections ON portal_customizations USING GIN(custom_sections);
CREATE INDEX IF NOT EXISTS idx_portal_custom_navigation ON portal_customizations USING GIN(custom_navigation_items);
CREATE INDEX IF NOT EXISTS idx_portal_documents ON portal_customizations USING GIN(documents);

-- =====================================================
-- PORTAL CUSTOMIZATION HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_customization_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customization_id UUID NOT NULL REFERENCES portal_customizations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    version INT NOT NULL,
    changes_summary TEXT,
    previous_values JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by UUID,
    rollback_available BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_history_customization_id ON portal_customization_history(customization_id);
CREATE INDEX IF NOT EXISTS idx_history_tenant_id ON portal_customization_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON portal_customization_history(changed_at);

-- =====================================================
-- COMPONENT REGISTRY
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_component_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_key VARCHAR(100) UNIQUE,
    component_name VARCHAR(255),
    component_description TEXT,
    default_visible BOOLEAN DEFAULT true,
    schema JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_component_registry_key ON portal_component_registry(component_key);

-- =====================================================
-- PORTAL THEMES
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name VARCHAR(100) UNIQUE,
    theme_key VARCHAR(100),
    description TEXT,
    config JSONB,
    is_default BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_themes_key ON portal_themes(theme_key);

-- =====================================================
-- SUPPORTED LANGUAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    language_code VARCHAR(5),
    language_name VARCHAR(100),
    translations JSONB,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_portal_languages_tenant ON portal_languages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_languages_code ON portal_languages(language_code);

-- =====================================================
-- CUSTOMIZATION AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_customization_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    action VARCHAR(50),
    section VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON portal_customization_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON portal_customization_audit(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON portal_customization_audit(action);

-- =====================================================
-- SEED DEFAULT COMPONENTS
-- =====================================================
INSERT INTO portal_component_registry (component_key, component_name, component_description, default_visible, schema)
VALUES
    ('hero', 'Hero Section', 'Large banner with headline, subheadline, and CTA', true, '{"properties": {"headline": "string", "subheadline": "string", "backgroundImage": "url"}}'),
    ('benefits', 'Benefits Section', 'Display employee benefits overview', true, '{}'),
    ('features', 'Features Section', 'Showcase portal features', true, '{}'),
    ('news', 'News Feed', 'Company news and updates', true, '{}'),
    ('announcements', 'Announcements', 'Important announcements banner', true, '{}'),
    ('contact', 'Contact Section', 'Contact information and form', true, '{}'),
    ('faq', 'FAQ', 'Frequently asked questions', false, '{}'),
    ('employee_directory', 'Employee Directory', 'Searchable employee listing', false, '{}'),
    ('org_chart', 'Organization Chart', 'Hierarchical org structure', false, '{}'),
    ('testimonials', 'Testimonials', 'Employee testimonials carousel', false, '{}')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================
-- SEED DEFAULT THEMES
-- =====================================================
INSERT INTO portal_themes (theme_name, theme_key, description, config, is_default)
VALUES
    (
        'Modern',
        'modern',
        'Clean, minimalist design with bold colors',
        '{"primaryColor": "#2563eb", "secondaryColor": "#10b981", "layoutType": "standard", "fontFamily": "Inter"}'::jsonb,
        true
    ),
    (
        'Corporate',
        'corporate',
        'Professional, traditional design',
        '{"primaryColor": "#1e40af", "secondaryColor": "#7c3aed", "layoutType": "standard", "fontFamily": "Georgia"}'::jsonb,
        false
    ),
    (
        'Healthcare',
        'healthcare',
        'Warm, approachable design for healthcare',
        '{"primaryColor": "#059669", "secondaryColor": "#06b6d4", "layoutType": "standard", "fontFamily": "Segoe UI"}'::jsonb,
        false
    ),
    (
        'Finance',
        'finance',
        'Secure, trustworthy design',
        '{"primaryColor": "#0f172a", "secondaryColor": "#64748b", "layoutType": "minimal", "fontFamily": "Roboto"}'::jsonb,
        false
    )
ON CONFLICT (theme_name) DO NOTHING;

-- =====================================================
-- VERIFY TABLES CREATED
-- =====================================================
-- Run this query to verify:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'portal_%';
