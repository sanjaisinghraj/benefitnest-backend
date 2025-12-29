-- =====================================================
-- COMPLIANCE POLICY SETTINGS SCHEMA
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD FIELD TO TENANTS TABLE
-- =====================================================
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS compliance_policy_setting VARCHAR(20) DEFAULT 'Default' 
    CHECK (compliance_policy_setting IN ('Default', 'Customized'));

COMMENT ON COLUMN tenants.compliance_policy_setting IS 'Determines whether to use country-default or tenant-customized compliance policies';

-- =====================================================
-- 2. DEFAULT COMPLIANCE POLICIES (Per Country)
-- =====================================================
CREATE TABLE IF NOT EXISTS compliance_policy_settings_default (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- Privacy Policy
    privacy_policy_title VARCHAR(255) DEFAULT 'Privacy Policy',
    privacy_policy_content TEXT NOT NULL,
    privacy_policy_version VARCHAR(20) DEFAULT '1.0',
    privacy_policy_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Terms and Conditions
    terms_conditions_title VARCHAR(255) DEFAULT 'Terms & Conditions',
    terms_conditions_content TEXT NOT NULL,
    terms_conditions_version VARCHAR(20) DEFAULT '1.0',
    terms_conditions_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Disclaimer
    disclaimer_title VARCHAR(255) DEFAULT 'Disclaimer',
    disclaimer_content TEXT NOT NULL,
    disclaimer_version VARCHAR(20) DEFAULT '1.0',
    disclaimer_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Consent Form Text (shown on login page)
    consent_checkbox_text TEXT DEFAULT 'I agree to the Privacy Policy and Terms & Conditions',
    consent_details_content TEXT, -- Expandable details
    
    -- Data Processing Agreement (for GDPR countries)
    dpa_required BOOLEAN DEFAULT FALSE,
    dpa_title VARCHAR(255) DEFAULT 'Data Processing Agreement',
    dpa_content TEXT,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Ensure one active policy set per country
    CONSTRAINT unique_active_country_policy UNIQUE (country_code, status)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_compliance_default_country ON compliance_policy_settings_default(country_code);
CREATE INDEX IF NOT EXISTS idx_compliance_default_status ON compliance_policy_settings_default(status);

COMMENT ON TABLE compliance_policy_settings_default IS 'Default compliance policies applicable per country';

-- =====================================================
-- 3. CUSTOMIZED COMPLIANCE POLICIES (Per Tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS compliance_policy_settings_customized (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    
    -- Privacy Policy
    privacy_policy_title VARCHAR(255) DEFAULT 'Privacy Policy',
    privacy_policy_content TEXT NOT NULL,
    privacy_policy_version VARCHAR(20) DEFAULT '1.0',
    privacy_policy_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Terms and Conditions
    terms_conditions_title VARCHAR(255) DEFAULT 'Terms & Conditions',
    terms_conditions_content TEXT NOT NULL,
    terms_conditions_version VARCHAR(20) DEFAULT '1.0',
    terms_conditions_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Disclaimer
    disclaimer_title VARCHAR(255) DEFAULT 'Disclaimer',
    disclaimer_content TEXT NOT NULL,
    disclaimer_version VARCHAR(20) DEFAULT '1.0',
    disclaimer_effective_date DATE DEFAULT CURRENT_DATE,
    
    -- Consent Form Text (shown on login page)
    consent_checkbox_text TEXT DEFAULT 'I agree to the Privacy Policy and Terms & Conditions',
    consent_details_content TEXT, -- Expandable details
    
    -- Data Processing Agreement (for GDPR compliance)
    dpa_required BOOLEAN DEFAULT FALSE,
    dpa_title VARCHAR(255) DEFAULT 'Data Processing Agreement',
    dpa_content TEXT,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Ensure one active policy set per tenant
    CONSTRAINT unique_active_tenant_policy UNIQUE (tenant_id, status)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_compliance_customized_tenant ON compliance_policy_settings_customized(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_customized_status ON compliance_policy_settings_customized(status);

COMMENT ON TABLE compliance_policy_settings_customized IS 'Custom compliance policies specific to each tenant';

-- =====================================================
-- 4. INSERT DEFAULT POLICIES FOR COMMON COUNTRIES
-- =====================================================

-- INDIA Default Policies
INSERT INTO compliance_policy_settings_default (
    country, 
    country_code,
    privacy_policy_content,
    terms_conditions_content,
    disclaimer_content,
    consent_checkbox_text,
    consent_details_content
) VALUES (
    'India',
    'IN',
    '<h4>1. Information We Collect</h4>
<p>In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, we collect personal information that you provide directly to us, including but not limited to: name, email address, employee ID, Aadhaar number (if applicable), PAN, contact information, and benefits-related data.</p>

<h4>2. How We Use Your Information</h4>
<p>We use the information we collect to: provide and maintain our services, process your benefits elections and insurance claims, communicate with you about your benefits, improve our services, and comply with legal obligations under Indian law.</p>

<h4>3. Information Sharing</h4>
<p>We may share your information with: your employer (for benefits administration purposes), IRDAI-registered insurance carriers and TPA providers, government authorities as required by law, and service providers who assist us in operating our platform.</p>

<h4>4. Data Security</h4>
<p>We implement appropriate technical and organizational measures as per IT Act guidelines to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

<h4>5. Your Rights</h4>
<p>Under the Digital Personal Data Protection Act, 2023, you have the right to access, correct, or delete your personal information. You may also request data portability and withdraw consent for processing.</p>

<h4>6. Grievance Redressal</h4>
<p>For any privacy-related concerns, please contact our Grievance Officer at privacy@benefitnest.space</p>',

    '<h4>1. Acceptance of Terms</h4>
<p>By accessing and using this Employee Benefits Portal, you accept and agree to be bound by these Terms and Conditions as governed by Indian law. If you do not agree to these terms, please do not use this portal.</p>

<h4>2. User Account</h4>
<p>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss arising from unauthorized use of your account.</p>

<h4>3. Acceptable Use</h4>
<p>You agree to use this portal only for lawful purposes in accordance with the Information Technology Act, 2000. You shall not use the portal to transmit harmful code, attempt unauthorized access, or interfere with the portal''s operation.</p>

<h4>4. Insurance and Benefits</h4>
<p>All insurance products displayed are regulated by the Insurance Regulatory and Development Authority of India (IRDAI). Benefits summaries are for informational purposes only. The official policy documents govern all claims.</p>

<h4>5. Dispute Resolution</h4>
<p>Any disputes arising from the use of this portal shall be subject to the exclusive jurisdiction of courts in India, governed by the Arbitration and Conciliation Act, 1996.</p>

<h4>6. Limitation of Liability</h4>
<p>To the maximum extent permitted by Indian law, BenefitNest shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of this portal.</p>',

    '<h4>General Disclaimer</h4>
<p>The information provided on this Employee Benefits Portal is for general informational purposes only. While we endeavor to keep the information up to date and correct, we make no representations or warranties of any kind about the completeness, accuracy, reliability, or availability of the information.</p>

<h4>Insurance Disclaimer</h4>
<p>Insurance is the subject matter of solicitation. IRDAI Registration details of the insurers are available on the IRDAI website. Please read the policy terms and conditions carefully before concluding the sale.</p>

<h4>Not Professional Advice</h4>
<p>The content on this portal does not constitute professional financial, legal, medical, or tax advice. Always consult with qualified professionals regarding your specific situation.</p>

<h4>Benefits Information</h4>
<p>Benefits summaries and descriptions are provided for convenience only. The official policy documents and Summary Plan Descriptions (SPDs) are the governing documents for all benefit plans.</p>

<h4>Third-Party Links</h4>
<p>This portal may contain links to third-party websites including insurance company portals. We have no control over the content of these sites.</p>',

    'I agree to the Privacy Policy and Terms & Conditions, and consent to the processing of my personal data as per the Digital Personal Data Protection Act, 2023',

    '<p><strong>By signing in, you acknowledge and agree that:</strong></p>
<ul>
<li>Your personal data will be processed in accordance with our Privacy Policy and the Digital Personal Data Protection Act, 2023</li>
<li>We may collect usage data to improve our services</li>
<li>Your employer and authorized insurance providers may access benefits-related information</li>
<li>You consent to receive notifications related to your benefits via SMS, email, and push notifications</li>
<li>All activities are logged for security and audit purposes as per IT Act guidelines</li>
<li>Your Aadhaar/PAN details (if provided) will be used only for KYC and regulatory compliance</li>
</ul>'
) ON CONFLICT DO NOTHING;

-- USA Default Policies
INSERT INTO compliance_policy_settings_default (
    country, 
    country_code,
    privacy_policy_content,
    terms_conditions_content,
    disclaimer_content,
    consent_checkbox_text,
    consent_details_content
) VALUES (
    'United States',
    'US',
    '<h4>1. Information We Collect</h4>
<p>We collect personal information that you provide directly to us, including but not limited to: name, email address, employee ID, Social Security Number (for benefits administration), contact information, and benefits-related data. We also automatically collect certain information when you use our portal.</p>

<h4>2. How We Use Your Information</h4>
<p>We use the information we collect to: provide and maintain our services, process your benefits elections, administer HIPAA-compliant health benefits, communicate with you about your benefits, improve our services, and comply with federal and state regulations.</p>

<h4>3. Information Sharing</h4>
<p>We may share your information with: your employer (for benefits administration purposes), insurance carriers and benefits providers, third-party administrators (TPAs), and as required by law including ERISA, HIPAA, and COBRA regulations.</p>

<h4>4. HIPAA Compliance</h4>
<p>Protected Health Information (PHI) is handled in accordance with the Health Insurance Portability and Accountability Act (HIPAA). We maintain appropriate administrative, physical, and technical safeguards.</p>

<h4>5. Your Rights</h4>
<p>Under various state privacy laws (including CCPA for California residents), you may have rights to access, correct, delete, or port your personal information. Contact us to exercise these rights.</p>

<h4>6. Contact Us</h4>
<p>If you have any questions about this Privacy Policy, please contact us at privacy@benefitnest.space</p>',

    '<h4>1. Acceptance of Terms</h4>
<p>By accessing and using this Employee Benefits Portal, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use this portal.</p>

<h4>2. ERISA Compliance</h4>
<p>This portal facilitates access to employee benefit plans governed by the Employee Retirement Income Security Act (ERISA). The plan documents and Summary Plan Descriptions (SPDs) are the governing documents.</p>

<h4>3. User Account Security</h4>
<p>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your account.</p>

<h4>4. Acceptable Use</h4>
<p>You agree to use this portal only for lawful purposes and in accordance with these Terms. You shall not attempt unauthorized access or interfere with the portal''s operation.</p>

<h4>5. COBRA Rights</h4>
<p>Information about COBRA continuation coverage rights is provided through this portal. Official COBRA notices govern your rights.</p>

<h4>6. Arbitration Agreement</h4>
<p>Any disputes arising from the use of this portal shall be resolved through binding arbitration in accordance with the Federal Arbitration Act.</p>

<h4>7. Limitation of Liability</h4>
<p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages.</p>',

    '<h4>General Disclaimer</h4>
<p>The information provided on this Employee Benefits Portal is for general informational purposes only. While we endeavor to keep the information up to date and correct, we make no representations or warranties of any kind.</p>

<h4>Not Professional Advice</h4>
<p>The content on this portal does not constitute professional financial, legal, medical, or tax advice. Always consult with qualified professionals regarding your specific situation.</p>

<h4>Benefits Information</h4>
<p>Benefits summaries are provided for convenience only. The official Summary Plan Descriptions (SPDs) and plan documents govern all benefit plans. In the event of any conflict, the plan documents will prevail.</p>

<h4>HIPAA Notice</h4>
<p>This portal may contain Protected Health Information (PHI). Access is restricted to authorized individuals only. Unauthorized access is prohibited and may be subject to civil and criminal penalties.</p>

<h4>Investment Disclaimer</h4>
<p>401(k) and retirement plan information is provided for educational purposes only. Past performance does not guarantee future results. Consult a qualified financial advisor before making investment decisions.</p>',

    'I agree to the Privacy Policy and Terms & Conditions',

    '<p><strong>By signing in, you acknowledge and agree that:</strong></p>
<ul>
<li>Your personal data will be processed in accordance with our Privacy Policy</li>
<li>Protected Health Information (PHI) will be handled per HIPAA requirements</li>
<li>Your employer and authorized plan administrators may access benefits-related information</li>
<li>You consent to receive notifications related to your benefits</li>
<li>All activities are logged for security and audit purposes</li>
</ul>'
) ON CONFLICT DO NOTHING;

-- UAE Default Policies
INSERT INTO compliance_policy_settings_default (
    country, 
    country_code,
    privacy_policy_content,
    terms_conditions_content,
    disclaimer_content,
    consent_checkbox_text,
    consent_details_content,
    dpa_required
) VALUES (
    'United Arab Emirates',
    'AE',
    '<h4>1. Information We Collect</h4>
<p>In accordance with UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection, we collect personal information including: name, Emirates ID, email address, employee ID, contact information, and benefits-related data.</p>

<h4>2. How We Use Your Information</h4>
<p>We use the information we collect to: provide and maintain our services, process your benefits elections, coordinate with insurance providers, comply with UAE labour law requirements, and improve our services.</p>

<h4>3. Information Sharing</h4>
<p>We may share your information with: your employer, insurance providers licensed by the Insurance Authority, government authorities as required by UAE law, and authorized service providers.</p>

<h4>4. Cross-Border Data Transfer</h4>
<p>Your data may be transferred outside the UAE only to jurisdictions with adequate data protection measures as defined by the UAE Data Protection Law.</p>

<h4>5. Data Security</h4>
<p>We implement appropriate technical and organizational measures to protect your personal information in compliance with UAE data protection standards.</p>

<h4>6. Your Rights</h4>
<p>Under UAE data protection law, you have the right to access, rectify, erase, and port your personal data. You may also object to processing and withdraw consent.</p>

<h4>7. Contact Us</h4>
<p>For data protection inquiries, contact our Data Protection Officer at privacy@benefitnest.space</p>',

    '<h4>1. Acceptance of Terms</h4>
<p>By accessing this Employee Benefits Portal, you accept these Terms and Conditions governed by the laws of the United Arab Emirates.</p>

<h4>2. User Account</h4>
<p>You are responsible for maintaining the confidentiality of your login credentials and all activities under your account.</p>

<h4>3. Acceptable Use</h4>
<p>You agree to use this portal only for lawful purposes in accordance with UAE Cybercrime Law (Federal Decree-Law No. 34 of 2021).</p>

<h4>4. Insurance Regulations</h4>
<p>All insurance products are regulated by the UAE Insurance Authority. Health insurance is mandatory as per DHA (Dubai) or HAAD (Abu Dhabi) requirements.</p>

<h4>5. End of Service Benefits</h4>
<p>Information about gratuity and end of service benefits is provided as per UAE Labour Law. Official calculations from your employer are governing.</p>

<h4>6. Dispute Resolution</h4>
<p>Any disputes shall be resolved through the competent courts of the UAE or through arbitration as agreed.</p>

<h4>7. Language</h4>
<p>In case of any conflict between English and Arabic versions, the Arabic version shall prevail as per UAE law.</p>',

    '<h4>General Disclaimer</h4>
<p>The information provided on this Portal is for general informational purposes only and does not constitute professional advice.</p>

<h4>Insurance Disclaimer</h4>
<p>All insurance products are subject to Insurance Authority regulations. Health insurance coverage is subject to DHA/DOH/HAAD requirements depending on the Emirate.</p>

<h4>Benefits Information</h4>
<p>Benefits summaries are provided for convenience. The official policy documents and UAE Labour Law govern all entitlements.</p>

<h4>Not Legal Advice</h4>
<p>Content does not constitute legal or financial advice. Consult qualified UAE-licensed professionals for specific guidance.</p>',

    'I agree to the Privacy Policy, Terms & Conditions, and consent to the processing of my personal data as per UAE Federal Decree-Law No. 45 of 2021',

    '<p><strong>By signing in, you acknowledge and agree that:</strong></p>
<ul>
<li>Your personal data will be processed per UAE Personal Data Protection Law</li>
<li>Your Emirates ID and related information will be used for benefits administration</li>
<li>Your employer and licensed insurance providers may access benefits-related information</li>
<li>You consent to receive notifications via SMS, email, and WhatsApp</li>
<li>All activities are logged for security and regulatory compliance</li>
</ul>',
    FALSE
) ON CONFLICT DO NOTHING;

-- UK Default Policies (GDPR)
INSERT INTO compliance_policy_settings_default (
    country, 
    country_code,
    privacy_policy_content,
    terms_conditions_content,
    disclaimer_content,
    consent_checkbox_text,
    consent_details_content,
    dpa_required,
    dpa_content
) VALUES (
    'United Kingdom',
    'GB',
    '<h4>1. Information We Collect</h4>
<p>In accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, we collect personal information including: name, email address, employee ID, National Insurance number, contact information, and benefits-related data.</p>

<h4>2. Legal Basis for Processing</h4>
<p>We process your data based on: contractual necessity (employment benefits), legal obligations (pension auto-enrolment, tax), legitimate interests (service improvement), and your explicit consent where required.</p>

<h4>3. How We Use Your Information</h4>
<p>We use your information to: administer your employee benefits, process pension contributions, comply with HMRC requirements, and communicate about your entitlements.</p>

<h4>4. Information Sharing</h4>
<p>We may share your information with: your employer, FCA-regulated insurance providers, pension trustees, HMRC, and authorized service providers under appropriate data processing agreements.</p>

<h4>5. International Transfers</h4>
<p>Data transfers outside the UK are protected by Standard Contractual Clauses or adequacy decisions as required by UK GDPR.</p>

<h4>6. Your Rights</h4>
<p>Under UK GDPR, you have rights to: access your data, rectification, erasure ("right to be forgotten"), restrict processing, data portability, object to processing, and rights related to automated decision-making.</p>

<h4>7. Data Protection Officer</h4>
<p>Contact our DPO at dpo@benefitnest.space or write to: Data Protection Officer, BenefitNest, [Address]</p>

<h4>8. Complaints</h4>
<p>You have the right to lodge a complaint with the Information Commissioner''s Office (ICO) at ico.org.uk</p>',

    '<h4>1. Acceptance of Terms</h4>
<p>By accessing this Portal, you accept these Terms governed by the laws of England and Wales.</p>

<h4>2. User Account</h4>
<p>You are responsible for maintaining the security of your login credentials and must notify us of any unauthorized access.</p>

<h4>3. Acceptable Use</h4>
<p>You agree to use this portal lawfully and not to violate the Computer Misuse Act 1990 or any applicable laws.</p>

<h4>4. Pension Regulations</h4>
<p>Workplace pension information is provided in accordance with auto-enrolment requirements under the Pensions Act 2008. The Pensions Regulator oversees compliance.</p>

<h4>5. Insurance Regulations</h4>
<p>Insurance products are regulated by the Financial Conduct Authority (FCA). Relevant regulatory disclosures are available upon request.</p>

<h4>6. Consumer Rights</h4>
<p>Your statutory consumer rights under the Consumer Rights Act 2015 are not affected by these terms.</p>

<h4>7. Dispute Resolution</h4>
<p>Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. Alternative dispute resolution may be available through the Financial Ombudsman Service for regulated products.</p>',

    '<h4>General Disclaimer</h4>
<p>Information on this Portal is for general guidance only and does not constitute professional advice.</p>

<h4>Pension Disclaimer</h4>
<p>Pension projections are estimates only. The value of investments can go down as well as up. Past performance is not a guide to future performance.</p>

<h4>Insurance Disclaimer</h4>
<p>Insurance products are regulated by the FCA. Please read policy documents carefully.</p>

<h4>Tax Information</h4>
<p>Tax treatment depends on individual circumstances and may be subject to change. Consult a qualified tax advisor.</p>

<h4>Not Financial Advice</h4>
<p>Nothing on this portal constitutes financial advice under FCA regulations. Seek independent financial advice if needed.</p>',

    'I agree to the Privacy Policy, Terms & Conditions, and consent to the processing of my personal data as per UK GDPR',

    '<p><strong>By signing in, you acknowledge and agree that:</strong></p>
<ul>
<li>Your personal data will be processed in accordance with UK GDPR and the Data Protection Act 2018</li>
<li>We process your data for the legitimate purposes of benefits administration</li>
<li>Your employer, pension trustees, and FCA-regulated providers may access relevant information</li>
<li>You consent to receive communications about your benefits</li>
<li>You can withdraw consent at any time without affecting the lawfulness of prior processing</li>
<li>You have the right to lodge a complaint with the ICO</li>
</ul>',
    TRUE,
    '<h4>Data Processing Agreement</h4>
<p>This Data Processing Agreement ("DPA") forms part of the Terms & Conditions and governs the processing of personal data.</p>

<h4>1. Definitions</h4>
<p>"Controller", "Processor", "Data Subject", "Personal Data", and "Processing" have the meanings given in UK GDPR.</p>

<h4>2. Scope</h4>
<p>This DPA applies to all personal data processed in connection with your use of the Employee Benefits Portal.</p>

<h4>3. Processing Details</h4>
<p>Nature: Employee benefits administration<br>
Purpose: Provision of benefits services<br>
Data subjects: Employees and dependents<br>
Data categories: Identity, contact, employment, benefits, health (where applicable)</p>

<h4>4. Processor Obligations</h4>
<p>We shall: process data only on documented instructions, ensure confidentiality, implement appropriate security measures, assist with data subject rights, and delete or return data upon termination.</p>

<h4>5. Sub-processors</h4>
<p>A list of approved sub-processors is available upon request. We will notify you of any changes.</p>

<h4>6. International Transfers</h4>
<p>Transfers outside the UK are protected by appropriate safeguards including Standard Contractual Clauses.</p>'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. UPDATE TRIGGER FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_compliance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_compliance_default_timestamp ON compliance_policy_settings_default;
CREATE TRIGGER update_compliance_default_timestamp
    BEFORE UPDATE ON compliance_policy_settings_default
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_timestamp();

DROP TRIGGER IF EXISTS update_compliance_customized_timestamp ON compliance_policy_settings_customized;
CREATE TRIGGER update_compliance_customized_timestamp
    BEFORE UPDATE ON compliance_policy_settings_customized
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_timestamp();

-- =====================================================
-- 6. VIEW FOR EASY POLICY LOOKUP
-- =====================================================
CREATE OR REPLACE VIEW tenant_compliance_policies AS
SELECT 
    t.tenant_id,
    t.subdomain,
    t.corporate_legal_name,
    t.country,
    t.compliance_policy_setting,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.privacy_policy_title
        ELSE d.privacy_policy_title
    END AS privacy_policy_title,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.privacy_policy_content
        ELSE d.privacy_policy_content
    END AS privacy_policy_content,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.terms_conditions_title
        ELSE d.terms_conditions_title
    END AS terms_conditions_title,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.terms_conditions_content
        ELSE d.terms_conditions_content
    END AS terms_conditions_content,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.disclaimer_title
        ELSE d.disclaimer_title
    END AS disclaimer_title,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.disclaimer_content
        ELSE d.disclaimer_content
    END AS disclaimer_content,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.consent_checkbox_text
        ELSE d.consent_checkbox_text
    END AS consent_checkbox_text,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.consent_details_content
        ELSE d.consent_details_content
    END AS consent_details_content,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.dpa_required
        ELSE d.dpa_required
    END AS dpa_required,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.dpa_title
        ELSE d.dpa_title
    END AS dpa_title,
    CASE 
        WHEN t.compliance_policy_setting = 'Customized' THEN c.dpa_content
        ELSE d.dpa_content
    END AS dpa_content
FROM tenants t
LEFT JOIN compliance_policy_settings_customized c 
    ON t.tenant_id = c.tenant_id AND c.status = 'ACTIVE'
LEFT JOIN compliance_policy_settings_default d 
    ON UPPER(t.country) = UPPER(d.country) AND d.status = 'ACTIVE';

COMMENT ON VIEW tenant_compliance_policies IS 'Unified view to get compliance policies for any tenant (auto-selects default or customized)';

-- =====================================================
-- 7. HELPFUL QUERIES
-- =====================================================

-- Get compliance policies for a specific subdomain:
-- SELECT * FROM tenant_compliance_policies WHERE subdomain = 'your-subdomain';

-- List all countries with default policies:
-- SELECT country, country_code, status FROM compliance_policy_settings_default;

-- Check which tenants use customized policies:
-- SELECT tenant_id, subdomain, corporate_legal_name FROM tenants WHERE compliance_policy_setting = 'Customized';
