// =====================================================
// BENEFITNEST - MASTERS MANAGEMENT ROUTES (ENHANCED v3)
// Features: AI Validation, Audit Logging, Regulatory Check,
//           Add Field, Download Data, View Record, Schema
// =====================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================================
// HELPER: GET PRIMARY KEY FOR ANY TABLE
// =====================================================
const getPrimaryKey = async (table) => {
    try {
        const { data, error } = await supabase.rpc('get_primary_key', { p_table: table });
        if (error || !data) return 'id';
        return data;
    } catch {
        return 'id';
    }
};

// =====================================================
// HELPER: AUDIT LOGGING
// =====================================================
const logAudit = async (req, {
    action_type, target_table, record_id = null, old_values = null, new_values = null,
    ai_validation_ran = false, ai_warnings_found = false, ai_warnings_ignored = false, ai_warning_text = null
}) => {
    try {
        const userId = req.user?.id || req.user?.admin_id || null;
        const userEmail = req.user?.email || null;
        await supabase.from('masters_audit_log').insert([{
            user_id: userId, user_email: userEmail, action_type, target_table,
            record_id: record_id ? String(record_id) : null,
            old_values: old_values ? JSON.stringify(old_values) : null,
            new_values: new_values ? JSON.stringify(new_values) : null,
            ai_validation_ran, ai_warnings_found, ai_warnings_ignored, ai_warning_text,
            ip_address: req.ip || req.headers['x-forwarded-for'] || null,
            user_agent: req.headers['user-agent'] || null
        }]);
    } catch (err) { console.error('Audit log error:', err.message); }
};

// =====================================================
// TABLE CONTEXT FOR INTELLIGENT VALIDATION
// =====================================================
const getTableContext = (table) => {
    const contexts = {
        insurers: {
            type: 'INSURANCE_COMPANY',
            description: 'Insurance companies/carriers that provide insurance policies',
            keyFields: ['name', 'code', 'email', 'phone', 'website', 'country', 'state', 'city', 'address'],
            validationRules: [
                'Verify insurer name is a real, registered insurance company in the specified country',
                'In India: Check against IRDAI registered insurers',
                'Check for typos in insurer names (e.g., "ICIC Lombard" should be "ICICI Lombard")',
                'Verify GSTIN format if provided (15 characters)',
                'Check PAN format if provided (10 characters, ABCDE1234F pattern)',
                'Website should be valid URL format',
                'Email should be valid corporate email format'
            ],
            knownEntities: ['ICICI Lombard', 'HDFC Ergo', 'Bajaj Allianz', 'Star Health', 'Max Bupa', 'Niva Bupa', 'Care Health', 'New India Assurance', 'United India Insurance', 'National Insurance Company', 'Oriental Insurance', 'SBI General', 'Tata AIG', 'Reliance General', 'Future Generali', 'Cholamandalam MS', 'Royal Sundaram', 'Aditya Birla Health', 'ManipalCigna', 'Go Digit', 'Acko', 'Iffco Tokio']
        },
        tpas: {
            type: 'TPA',
            description: 'Third Party Administrators that manage insurance claims',
            keyFields: ['name', 'code', 'email', 'phone', 'website', 'country', 'state', 'city', 'license_number'],
            validationRules: [
                'Verify TPA name is a real, IRDAI registered TPA in India',
                'Check for typos in TPA names',
                'Verify TPA license number format if provided',
                'Email should be valid corporate email format',
                'Phone should have valid format for the country'
            ],
            knownEntities: ['Medi Assist', 'Vidal Health', 'Health India TPA', 'MDIndia', 'Paramount Health Services', 'FHPL', 'Raksha TPA', 'Heritage Health TPA', 'Safeway TPA', 'Good Health TPA', 'Park Mediclaim', 'Genins India', 'Medsave Health', 'East West Assist']
        },
        brokers: {
            type: 'INSURANCE_BROKER',
            description: 'Insurance brokers that sell and service insurance policies',
            keyFields: ['name', 'code', 'email', 'phone', 'license_number', 'country', 'state', 'city'],
            validationRules: [
                'Verify broker name if it is a known registered broker',
                'In India: Should have IRDAI broker license',
                'License number format should be valid',
                'Email should be valid corporate email format'
            ],
            knownEntities: ['Marsh', 'Aon', 'Willis Towers Watson', 'Gallagher', 'Howden', 'Lockton', 'Policy Bazaar', 'Insurance Dekho', 'Coverfox', 'Turtlemint', 'RenewBuy']
        },
        tenants: {
            type: 'CORPORATE',
            description: 'Corporate clients/companies that purchase group insurance for employees',
            keyFields: ['name', 'corporate_type', 'industry_type', 'email', 'phone', 'website', 'country', 'state', 'city', 'gstin', 'pan', 'cin', 'address'],
            validationRules: [
                'Corporate name should be a valid registered company name',
                'GSTIN must be 15 characters with valid format (e.g., 22AAAAA0000A1Z5)',
                'PAN must be 10 characters (e.g., ABCDE1234F)',
                'CIN must be 21 characters for Indian companies',
                'Industry type should match the nature of business',
                'Corporate type should be valid (Private Limited, Public Limited, LLP, etc.)',
                'Email should be valid corporate email (not personal gmail/yahoo)',
                'Address, city, state, country should be real and correctly spelled',
                'Pincode should match city/state for Indian addresses'
            ],
            knownEntities: []
        },
        hospitals: {
            type: 'HOSPITAL',
            description: 'Healthcare providers / Hospitals in the network',
            keyFields: ['name', 'hospital_type', 'address', 'city', 'state', 'country', 'pincode', 'phone', 'email'],
            validationRules: [
                'Hospital name should be a real, existing hospital',
                'Verify hospital exists in the specified city/location',
                'Address should be complete and valid',
                'City and state should match correctly',
                'Pincode should be valid for the city/state'
            ],
            knownEntities: ['Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare', 'Medanta', 'Manipal Hospitals', 'Narayana Health', 'AIIMS', 'Kokilaben Dhirubhai Ambani Hospital', 'Lilavati Hospital', 'Hinduja Hospital', 'Wockhardt Hospitals', 'Aster Hospitals', 'KIMS', 'Care Hospitals']
        },
        insurer_locations: {
            type: 'INSURER_LOCATION',
            description: 'Branch offices and locations of insurance companies',
            keyFields: ['insurer_id', 'office_type', 'office_name', 'address', 'city', 'state', 'country', 'pincode', 'phone', 'email'],
            validationRules: [
                'insurer_id must reference a valid insurer',
                'Office type should be valid (HO, RO, DO, BO, Branch, Claims Center)',
                'City, state, country must be real places',
                'City should be in the correct state',
                'Pincode should match the city (for India)'
            ],
            knownEntities: []
        },
        tpa_locations: {
            type: 'TPA_LOCATION',
            description: 'Branch offices and locations of TPAs',
            keyFields: ['tpa_id', 'office_type', 'office_name', 'address', 'city', 'state', 'country', 'pincode', 'phone', 'email'],
            validationRules: [
                'tpa_id must reference a valid TPA',
                'Office type should be valid (HO, RO, DO, BO, Branch)',
                'City, state, country must be real places',
                'Pincode should match the city (for India)'
            ],
            knownEntities: []
        },
        corporate_types: {
            type: 'MASTER_DATA',
            description: 'Types of corporate entities',
            keyFields: ['name', 'code', 'description'],
            validationRules: ['Name should be a valid corporate type', 'Code should be uppercase, no spaces, unique', 'Check for duplicates'],
            knownEntities: ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Proprietorship', 'Trust', 'Society', 'Government', 'PSU', 'NGO']
        },
        industry_types: {
            type: 'MASTER_DATA',
            description: 'Industry classifications',
            keyFields: ['name', 'code', 'description'],
            validationRules: ['Name should be a valid industry classification', 'Code should be uppercase, no spaces, unique', 'Check for duplicates'],
            knownEntities: ['IT/Software', 'Manufacturing', 'Healthcare', 'BFSI', 'Retail', 'Telecom', 'Automobile', 'Pharma', 'FMCG', 'Education', 'Hospitality', 'Real Estate', 'Media', 'E-commerce']
        },
        job_levels: {
            type: 'MASTER_DATA',
            description: 'Employee job levels/grades',
            keyFields: ['name', 'code', 'description', 'sort_order'],
            validationRules: ['Name should be a valid job level', 'Code should be uppercase, no spaces', 'Sort order should be logical'],
            knownEntities: ['Trainee', 'Junior', 'Associate', 'Senior', 'Lead', 'Manager', 'Senior Manager', 'AVP', 'VP', 'SVP', 'Director', 'CXO']
        },
        account_managers: {
            type: 'USER',
            description: 'Account managers who manage corporate clients',
            keyFields: ['name', 'email', 'phone', 'employee_id'],
            validationRules: ['Name should be a valid person name', 'Email should be valid corporate email format', 'Phone should be valid format', 'Check for duplicate emails'],
            knownEntities: []
        },
        admins: {
            type: 'USER',
            description: 'System administrators',
            keyFields: ['name', 'email', 'phone', 'role'],
            validationRules: ['Name should be a valid person name', 'Email should be valid format', 'Role should be valid', 'Check for duplicate emails'],
            knownEntities: []
        },
        regulatory_authorities: {
            type: 'MASTER_DATA',
            description: 'Government regulatory authorities for insurance',
            keyFields: ['entity_type', 'country', 'authority_name', 'verification_url'],
            validationRules: ['Entity type should be valid (INSURER, TPA, CORPORATE)', 'Country should be a real country', 'Authority name should be correct for the country'],
            knownEntities: ['IRDAI', 'MCA', 'FCA', 'SEC', 'NAIC']
        },
        icd_codes: {
            type: 'MEDICAL_CODE',
            description: 'International Classification of Diseases codes',
            keyFields: ['code', 'description', 'category'],
            validationRules: ['Code should follow ICD-10/ICD-11 format', 'Description should match official ICD description', 'Check for duplicates'],
            knownEntities: []
        },
        policy_type: {
            type: 'MASTER_DATA',
            description: 'Types of insurance policies',
            keyFields: ['name', 'code', 'description', 'category'],
            validationRules: ['Name should be a valid policy type', 'Code should be uppercase', 'Check for duplicates'],
            knownEntities: ['Group Health', 'Group Term Life', 'Personal Accident', 'Top-up', 'Super Top-up', 'OPD', 'Dental', 'Vision', 'Critical Illness']
        }
    };
    return contexts[table] || {
        type: 'GENERIC', description: `Generic table: ${table}`, keyFields: [],
        validationRules: ['Check for empty required fields', 'Validate email formats', 'Validate phone formats', 'Check for duplicates'],
        knownEntities: []
    };
};

// =====================================================
// SMART AI VALIDATION PROMPT - Self-Learning, Context-Aware
// =====================================================
const buildValidationPrompt = (table, records, context) => {
    const recordsWithRow = records.map((r, i) => ({ _row: i + 1, ...r }));
    
    // Extract field names from records to help AI understand the schema
    const fieldNames = records.length > 0 ? Object.keys(records[0]).join(', ') : 'unknown fields';
    
    return `You are an expert data validation AI with access to real-world knowledge about companies, places, regulations, and business entities worldwide.

## YOUR MISSION
Analyze the "${table}" table records and find ANY data quality issues.

## HOW TO THINK:
1. **Read each field name** and UNDERSTAND what data it should contain:
   - Field names like "corporate_legal_name", "company_name", "tenant_name" → Real registered company names
   - Field names like "insurer_name", "insurance_company" → Real insurance companies
   - Field names like "tpa_name" → Real Third Party Administrators
   - Field names like "hospital_name" → Real hospitals
   - Field names like "city", "state", "country" → Real geographic locations
   - Field names with "email" → Valid email format
   - Field names with "phone", "mobile" → Valid phone format
   - Field names like "gstin" → Indian GST number (15 chars: 22AAAAA0000A1Z5)
   - Field names like "pan" → Indian PAN (10 chars: ABCDE1234F)
   - Field names like "cin" → Company Identification Number (21 chars)
   - Field names like "pincode", "zip" → Valid postal codes

2. **Use context from other fields**:
   - If "country" = "India", validate against Indian data (real Indian companies, cities, states)
   - If "country" = "USA", validate against US data
   - City should exist in the specified state
   - State should exist in the specified country

3. **DETECT DUMMY/TEST/FAKE DATA** (CRITICAL):
   - Names like "Test", "Demo", "Sample", "ABC", "XYZ", "Dummy", "Example"
   - Random strings or placeholder text
   - Obviously fake company names
   - Names that don't match real registered entities
   
4. **VERIFY REAL ENTITIES using your knowledge**:
   - Indian Insurers: ICICI Lombard, HDFC Ergo, Bajaj Allianz, Star Health, Max Bupa, New India Assurance, United India, National Insurance, Oriental Insurance, SBI General, Tata AIG, Reliance General, Care Health, Niva Bupa, etc.
   - Indian TPAs: Medi Assist, Vidal Health, MDIndia, Paramount Health, FHPL, Raksha TPA, Heritage Health, Park Mediclaim, etc.
   - If a company/hospital/place name is given, CHECK if it's real or made up

5. **CHECK DATA CONSISTENCY**:
   - Industry type should match the company's actual business
   - Corporate type (Pvt Ltd, LLP, etc.) should match naming convention
   - Dates should be logical (not in future for past events, etc.)

## TABLE: ${table}
## TABLE TYPE: ${context.type}
## FIELDS IN RECORDS: ${fieldNames}

## RECORDS TO VALIDATE:
${JSON.stringify(recordsWithRow, null, 2)}

## STRICT VALIDATION RULES:
- BE VERY STRICT - Flag ANYTHING that looks suspicious
- Dummy/test data is an ERROR, not just a warning
- Misspelled city/company names are ERRORS
- Invalid formats (email, phone, GSTIN, PAN) are ERRORS
- Inconsistent data (city not in state) are ERRORS
- Unknown/unverifiable company names are WARNINGS
- Always provide the current value in your response
- Always suggest corrections when you know the right value

## RESPONSE FORMAT (PURE JSON - NO MARKDOWN, NO BACKTICKS, NO EXPLANATION):
{
  "has_warnings": true,
  "warnings": [
    {
      "row": 1,
      "field": "corporate_legal_name",
      "value": "Test Company Pvt Ltd",
      "message": "This appears to be a dummy/test company name. Please enter the actual registered company name.",
      "severity": "error",
      "suggested_value": null
    }
  ]
}

If ALL records pass validation: {"has_warnings": false, "warnings": []}

ANALYZE NOW AND RETURN ONLY JSON:`;
};

// =====================================================
// HELPER: AI VALIDATION (Context-Aware)
// =====================================================
const performAIValidation = async (table, records, validationType = 'general') => {
    const provider = process.env.AI_PROVIDER || 'groq';
    const apiKey = process.env.AI_API_KEY || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.log('No AI API key configured, skipping AI validation');
        return { has_warnings: false, warnings: [] };
    }

    try {
        const context = getTableContext(table);
        const prompt = buildValidationPrompt(table, records, context);
        
        let response, result;

        if (provider === 'groq') {
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 4000
                })
            });
            result = await response.json();
            console.log('Groq API response status:', response.status);
            if (result.error) { console.error('Groq API error:', result.error); return { has_warnings: false, warnings: [] }; }
            const content = result.choices?.[0]?.message?.content || '{"has_warnings": false, "warnings": []}';
            console.log('Groq content:', content.substring(0, 500));
            let cleanContent = content.replace(/```json|```/g, '').trim();
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) cleanContent = jsonMatch[0];
            return JSON.parse(cleanContent);

        } else if (provider === 'claude' || provider === 'anthropic') {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
            });
            result = await response.json();
            const content = result.content?.[0]?.text || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());

        } else if (provider === 'openai') {
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.1 })
            });
            result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());

        } else if (provider === 'gemini') {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            result = await response.json();
            const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());
        }

        return { has_warnings: false, warnings: [] };
    } catch (error) {
        console.error('AI validation error:', error);
        return { has_warnings: false, warnings: [] };
    }
};
// =====================================================
// GET ALL TABLES (Dynamic)
// =====================================================
router.get('/masters/tables', async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_all_tables_dynamic');
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET LOOKUP DATA (for dropdowns - corporate_types, industry_types, etc.)
// =====================================================
router.get('/masters/lookups/all', async (req, res) => {
    try {
        const lookups = {};

        // Corporate Types
        const { data: corporateTypes } = await supabase
            .from('corporate_types')
            .select('id, name, code')
            .eq('is_active', true)
            .order('name');
        lookups.corporate_types = corporateTypes || [];

        // Industry Types
        const { data: industryTypes } = await supabase
            .from('industry_types')
            .select('id, name, code')
            .eq('is_active', true)
            .order('name');
        lookups.industry_types = industryTypes || [];

        // Job Levels
        const { data: jobLevels } = await supabase
            .from('job_levels')
            .select('id, name, code')
            .eq('is_active', true)
            .order('name');
        lookups.job_levels = jobLevels || [];

        // Insurers
        const { data: insurers } = await supabase
            .from('insurers')
            .select('insurer_id, name, code')
            .order('name');
        lookups.insurers = insurers || [];

        // TPAs
        const { data: tpas } = await supabase
            .from('tpas')
            .select('tpa_id, name, code')
            .order('name');
        lookups.tpas = tpas || [];

        // Brokers
        const { data: brokers } = await supabase
            .from('brokers')
            .select('broker_id, name, code')
            .order('name');
        lookups.brokers = brokers || [];

        // Account Managers
        const { data: managers } = await supabase
            .from('account_managers')
            .select('manager_id, name, email')
            .order('name');
        lookups.account_managers = managers || [];

        res.json({ success: true, lookups });
    } catch (error) {
        console.error('Error fetching lookups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


router.get('/masters/:table/fk-options', async (req, res) => {
    try {
        const { table } = req.params;

        // Define FK relationships
        const fkRelations = {
            'tpa_locations': {
                'tpa_id': { table: 'tpas', pk: 'tpa_id', display: 'name' }
            },
            'insurer_locations': {
                'insurer_id': { table: 'insurers', pk: 'insurer_id', display: 'name' }
            },
            'policy_configuration': {
                'policy_type_id': { table: 'policy_type', pk: 'id', display: 'name' }
            },
            'tenants': {
                'insurer_id': { table: 'insurers', pk: 'insurer_id', display: 'name' },
                'broker_id': { table: 'brokers', pk: 'broker_id', display: 'name' },
                'tpa_id': { table: 'tpas', pk: 'tpa_id', display: 'name' },
                'account_manager_id': { table: 'account_managers', pk: 'manager_id', display: 'name' },
                'corporate_type': { table: 'corporate_types', pk: 'id', display: 'name' },
                'industry_type': { table: 'industry_types', pk: 'id', display: 'name' }
            }
        };

        const relations = fkRelations[table] || {};
        const options = {};

        for (const [column, config] of Object.entries(relations)) {
            try {
                const { data } = await supabase
                    .from(config.table)
                    .select(`${config.pk}, ${config.display}`)
                    .order(config.display);

                options[column] = (data || []).map(row => ({
                    value: row[config.pk],
                    label: row[config.display] || row[config.pk]
                }));
            } catch (e) {
                options[column] = [];
            }
        }

        res.json({ success: true, options });
    } catch (error) {
        console.error('Error fetching FK options:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});



// =====================================================
// GET TABLE SCHEMA (Dynamic) - Enhanced with more details
// =====================================================
router.get('/masters/:table/schema', async (req, res) => {
    try {
        const { table } = req.params;
        const { data, error } = await supabase.rpc('get_table_schema', {
            p_schema: 'public',
            p_table: table
        });
        if (error) throw error;
        res.json({ success: true, columns: data || [] });
    } catch (error) {
        console.error('Error fetching schema:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET DETAILED TABLE STRUCTURE (for Schema modal)
// =====================================================
router.get('/masters/:table/structure', async (req, res) => {
    try {
        const { table } = req.params;
        
        // Get columns with full details
        const { data: columns, error: colError } = await supabase.rpc('get_table_schema', {
            p_schema: 'public',
            p_table: table
        });
        
        if (colError) throw colError;

        // Get primary key
        const pk = await getPrimaryKey(table);

        // Get foreign key info
        const { data: fkData } = await supabase.rpc('get_foreign_key_references', {
            p_table: table,
            p_column: pk
        });

        // Get record count
        const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        res.json({
            success: true,
            table_name: table,
            primary_key: pk,
            record_count: count || 0,
            columns: columns || [],
            referenced_by: fkData || []
        });
    } catch (error) {
        console.error('Error fetching structure:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET ALL RECORDS (with search fix)
// =====================================================
router.get('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { page = 1, limit = 100, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Fetch all records
        let query = supabase
            .from(table)
            .select('*', { count: 'exact' });

        const { data: allData, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Apply search filter in memory
        let filteredData = allData || [];
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            filteredData = allData.filter(record => {
                return Object.values(record).some(value => 
                    value && String(value).toLowerCase().includes(searchLower)
                );
            });
        }

        // Apply pagination
        const paginatedData = filteredData.slice(offset, offset + parseInt(limit));
        const filteredCount = filteredData.length;

        res.json({
            success: true,
            data: paginatedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: search ? filteredCount : count,
                total_pages: Math.ceil((search ? filteredCount : count) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET SINGLE RECORD (View)
// =====================================================
router.get('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const pk = await getPrimaryKey(table);

        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq(pk, id)
            .single();

        if (error) throw error;

        await logAudit(req, {
            action_type: 'VIEW',
            target_table: table,
            record_id: id
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// DOWNLOAD ALL DATA
// =====================================================
router.get('/masters/:table/download/all', async (req, res) => {
    try {
        const { table } = req.params;

        const { data, error } = await supabase
            .from(table)
            .select('*');

        if (error) throw error;

        await logAudit(req, {
            action_type: 'DOWNLOAD',
            target_table: table,
            new_values: { record_count: data?.length || 0 }
        });

        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error downloading data:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// CHECK DEPENDENCIES
// =====================================================
router.get('/masters/:table/:id/dependencies', async (req, res) => {
    try {
        const { table, id } = req.params;
        const pk = await getPrimaryKey(table);

        const { data: fkData } = await supabase.rpc('get_foreign_key_references', {
            p_table: table,
            p_column: pk
        });

        const dependencies = [];
        if (fkData && fkData.length > 0) {
            for (const fk of fkData) {
                try {
                    const { count } = await supabase
                        .from(fk.referencing_table)
                        .select('*', { count: 'exact', head: true })
                        .eq(fk.referencing_column, id);

                    if (count > 0) {
                        dependencies.push({
                            table: fk.referencing_table,
                            column: fk.referencing_column,
                            count
                        });
                    }
                } catch (e) { }
            }
        }

        res.json({
            success: true,
            has_dependencies: dependencies.length > 0,
            dependencies
        });
    } catch (error) {
        console.error('Error checking dependencies:', error);
        res.json({ success: true, has_dependencies: false, dependencies: [] });
    }
});

// =====================================================
// GET FOREIGN KEY OPTIONS (for dropdowns)
// =====================================================
// =====================================================
// CREATE RECORD (with AI validation)
// =====================================================
router.post('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { record, skip_ai_validation = false, ai_warnings_ignored = false, ai_warning_text = null } = req.body;
        const pk = await getPrimaryKey(table);

        // Remove primary key if present
        delete record[pk];
        
        // Remove empty strings for non-required fields
        Object.keys(record).forEach(key => {
            if (record[key] === '') {
                record[key] = null;
            }
        });

        // AI Validation (unless skipped)
        let aiResult = { has_warnings: false, warnings: [] };
        if (!skip_ai_validation) {
            aiResult = await performAIValidation(table, [record]);
            if (aiResult.has_warnings && !ai_warnings_ignored) {
                return res.status(200).json({
                    success: false,
                    requires_confirmation: true,
                    validation: aiResult
                });
            }
        }

        const { data, error } = await supabase
            .from(table)
            .insert([record])
            .select()
            .single();

        if (error) throw error;

        await logAudit(req, {
            action_type: 'ADD',
            target_table: table,
            record_id: data[pk],
            new_values: record,
            ai_validation_ran: !skip_ai_validation,
            ai_warnings_found: aiResult.has_warnings,
            ai_warnings_ignored,
            ai_warning_text
        });

        res.status(201).json({
            success: true,
            message: 'Record created successfully',
            data
        });
    } catch (error) {
        console.error('Error creating record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// BULK CREATE RECORDS (FIXED)
// =====================================================
router.post('/masters/:table/bulk', async (req, res) => {
    try {
        const { table } = req.params;
        const { records, skip_ai_validation = false, ai_warnings_ignored = false, ai_warning_text = null } = req.body;
        const pk = await getPrimaryKey(table);

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'No records provided' });
        }

        console.log(`Bulk upload: ${records.length} records to ${table}`);

        // AI Validation
        let aiResult = { has_warnings: false, warnings: [] };
        if (!skip_ai_validation) {
            aiResult = await performAIValidation(table, records);
            console.log('AI Validation result:', aiResult);
            if (aiResult.has_warnings && !ai_warnings_ignored) {
                return res.status(200).json({
                    success: false,
                    requires_confirmation: true,
                    validation: aiResult
                });
            }
        }

        // Clean records - remove primary keys and empty strings
        const cleanRecords = records.map(r => {
            const copy = { ...r };
            delete copy[pk];
            delete copy['_row']; // Remove row number if added
            
            // Convert empty strings to null
            Object.keys(copy).forEach(key => {
                if (copy[key] === '' || copy[key] === undefined) {
                    copy[key] = null;
                }
            });
            
            return copy;
        });

        console.log('Clean records:', cleanRecords);

        const results = { success: 0, failed: 0, errors: [] };

        // Insert records one by one to catch individual errors
        for (let i = 0; i < cleanRecords.length; i++) {
            try {
                const { error } = await supabase.from(table).insert([cleanRecords[i]]);
                if (error) {
                    console.error(`Row ${i + 1} error:`, error.message);
                    results.failed++;
                    results.errors.push({ row: i + 1, error: error.message });
                } else {
                    results.success++;
                }
            } catch (e) {
                console.error(`Row ${i + 1} exception:`, e.message);
                results.failed++;
                results.errors.push({ row: i + 1, error: e.message });
            }
        }

        await logAudit(req, {
            action_type: 'BULK_UPLOAD',
            target_table: table,
            new_values: { total: records.length, success: results.success, failed: results.failed },
            ai_validation_ran: !skip_ai_validation,
            ai_warnings_found: aiResult.has_warnings,
            ai_warnings_ignored,
            ai_warning_text
        });

        res.json({
            success: true,
            message: `Uploaded ${results.success} of ${records.length} records`,
            results
        });
    } catch (error) {
        console.error('Error bulk creating:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// UPDATE RECORD
// =====================================================
router.put('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const { updates, skip_ai_validation = false, ai_warnings_ignored = false, ai_warning_text = null } = req.body;
        const pk = await getPrimaryKey(table);

        // Get old record for audit
        const { data: oldRecord } = await supabase
            .from(table)
            .select('*')
            .eq(pk, id)
            .single();

        // Don't update primary key or timestamps
        delete updates[pk];
        delete updates.created_at;
        
        // Convert empty strings to null
        Object.keys(updates).forEach(key => {
            if (updates[key] === '') {
                updates[key] = null;
            }
        });

        // AI Validation
        let aiResult = { has_warnings: false, warnings: [] };
        if (!skip_ai_validation) {
            aiResult = await performAIValidation(table, [updates]);
            if (aiResult.has_warnings && !ai_warnings_ignored) {
                return res.status(200).json({
                    success: false,
                    requires_confirmation: true,
                    validation: aiResult
                });
            }
        }

        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq(pk, id)
            .select()
            .single();

        if (error) throw error;

        await logAudit(req, {
            action_type: 'EDIT',
            target_table: table,
            record_id: id,
            old_values: oldRecord,
            new_values: updates,
            ai_validation_ran: !skip_ai_validation,
            ai_warnings_found: aiResult.has_warnings,
            ai_warnings_ignored,
            ai_warning_text
        });

        res.json({
            success: true,
            message: 'Record updated successfully',
            data
        });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// DELETE RECORD
// =====================================================
router.delete('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const pk = await getPrimaryKey(table);

        const { data: oldRecord } = await supabase
            .from(table)
            .select('*')
            .eq(pk, id)
            .single();

        const { error } = await supabase
            .from(table)
            .delete()
            .eq(pk, id);

        if (error) throw error;

        await logAudit(req, {
            action_type: 'DELETE',
            target_table: table,
            record_id: id,
            old_values: oldRecord
        });

        res.json({
            success: true,
            message: 'Record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// AI VALIDATION ENDPOINT (Manual trigger for single/multiple records)
// =====================================================
router.post('/masters/:table/validate', async (req, res) => {
    try {
        const { table } = req.params;
        const { records } = req.body;

        const result = await performAIValidation(table, records);

        await logAudit(req, {
            action_type: 'AI_VALIDATE',
            target_table: table,
            ai_validation_ran: true,
            ai_warnings_found: result.has_warnings,
            ai_warning_text: result.warnings?.length > 0 ? JSON.stringify(result.warnings) : null
        });

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('AI validation error:', error);
        res.json({ success: true, has_warnings: false, warnings: [] });
    }
});

// =====================================================
// AI VALIDATE ENTIRE TABLE
// =====================================================
router.post('/masters/:table/validate-all', async (req, res) => {
    try {
        const { table } = req.params;

        // Fetch all records
        const { data: allRecords, error } = await supabase
            .from(table)
            .select('*');

        if (error) throw error;

        if (!allRecords || allRecords.length === 0) {
            return res.json({ success: true, has_warnings: false, warnings: [], message: 'No records to validate' });
        }

        console.log(`Validating ${allRecords.length} records from ${table}`);

        // Validate in batches of 10 to avoid token limits
        const batchSize = 10;
        const allWarnings = [];

        for (let i = 0; i < allRecords.length; i += batchSize) {
            const batch = allRecords.slice(i, i + batchSize);
            console.log(`Validating batch ${i / batchSize + 1}, records ${i + 1} to ${Math.min(i + batchSize, allRecords.length)}`);
            
            const result = await performAIValidation(table, batch);
            
            if (result.warnings && result.warnings.length > 0) {
                // Adjust row numbers for the full dataset
                const adjustedWarnings = result.warnings.map(w => ({
                    ...w,
                    row: (w.row || 1) + i
                }));
                allWarnings.push(...adjustedWarnings);
            }
        }

        await logAudit(req, {
            action_type: 'AI_VALIDATE',
            target_table: table,
            new_values: { total_records: allRecords.length, warnings_count: allWarnings.length },
            ai_validation_ran: true,
            ai_warnings_found: allWarnings.length > 0,
            ai_warning_text: allWarnings.length > 0 ? JSON.stringify(allWarnings.slice(0, 50)) : null
        });

        res.json({
            success: true,
            has_warnings: allWarnings.length > 0,
            warnings: allWarnings,
            total_records: allRecords.length
        });
    } catch (error) {
        console.error('Full table validation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// ADD NEW FIELD TO TABLE
// =====================================================
router.post('/masters/:table/add-field', async (req, res) => {
    try {
        const { table } = req.params;
        const { 
            column_name, 
            data_type, 
            is_nullable = true, 
            default_value = null,
            description = null 
        } = req.body;

        if (!/^[a-z][a-z0-9_]*$/.test(column_name)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Column name must start with a letter and contain only lowercase letters, numbers, and underscores' 
            });
        }

        const typeMap = {
            'text': 'TEXT',
            'string': 'VARCHAR(255)',
            'varchar': 'VARCHAR(255)',
            'number': 'INTEGER',
            'integer': 'INTEGER',
            'decimal': 'DECIMAL(10,2)',
            'boolean': 'BOOLEAN',
            'date': 'DATE',
            'datetime': 'TIMESTAMPTZ',
            'timestamp': 'TIMESTAMPTZ',
            'uuid': 'UUID',
            'json': 'JSONB',
            'array': 'TEXT[]'
        };

        const pgType = typeMap[data_type.toLowerCase()] || 'TEXT';
        const nullable = is_nullable ? '' : 'NOT NULL';
        const defaultClause = default_value ? `DEFAULT '${default_value}'` : '';

        const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${column_name} ${pgType} ${nullable} ${defaultClause}`.trim();

        const { error } = await supabase.rpc('execute_ddl', { sql_statement: sql });

        if (error) {
            if (error.message.includes('function') || error.message.includes('does not exist')) {
                return res.json({
                    success: false,
                    message: 'DDL function not available. Please run this SQL manually in Supabase:',
                    sql: sql
                });
            }
            throw error;
        }

        if (description) {
            await supabase.rpc('execute_ddl', { 
                sql_statement: `COMMENT ON COLUMN public.${table}.${column_name} IS '${description}'` 
            });
        }

        await logAudit(req, {
            action_type: 'ADD_FIELD',
            target_table: table,
            new_values: { column_name, data_type: pgType, is_nullable, default_value, description }
        });

        res.json({
            success: true,
            message: `Column '${column_name}' added to table '${table}'`,
            column: { column_name, data_type: pgType, is_nullable, default_value }
        });
    } catch (error) {
        console.error('Error adding field:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET AUDIT LOGS
// =====================================================
router.get('/masters/audit-logs', async (req, res) => {
    try {
        const { table, action_type, user_id, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('masters_audit_log')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (table) query = query.eq('target_table', table);
        if (action_type) query = query.eq('action_type', action_type);
        if (user_id) query = query.eq('user_id', user_id);

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
