// =====================================================
// BENEFITNEST - MASTERS MANAGEMENT ROUTES (ENHANCED)
// Features: AI Validation, Audit Logging, Regulatory Check,
//           Add Field, Download Data, View Record
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
    action_type,
    target_table,
    record_id = null,
    old_values = null,
    new_values = null,
    ai_validation_ran = false,
    ai_warnings_found = false,
    ai_warnings_ignored = false,
    ai_warning_text = null
}) => {
    try {
        const userId = req.user?.id || req.user?.admin_id || null;
        const userEmail = req.user?.email || null;

        await supabase.from('masters_audit_log').insert([{
            user_id: userId,
            user_email: userEmail,
            action_type,
            target_table,
            record_id: record_id ? String(record_id) : null,
            old_values: old_values ? JSON.stringify(old_values) : null,
            new_values: new_values ? JSON.stringify(new_values) : null,
            ai_validation_ran,
            ai_warnings_found,
            ai_warnings_ignored,
            ai_warning_text,
            ip_address: req.ip || req.headers['x-forwarded-for'] || null,
            user_agent: req.headers['user-agent'] || null
        }]);
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

// =====================================================
// HELPER: AI VALIDATION (Pluggable Provider)
// =====================================================
const performAIValidation = async (table, records, validationType = 'general') => {
    const warnings = [];

    // Check which AI provider is configured
    const provider = process.env.AI_PROVIDER || 'claude'; // claude, openai, gemini, groq
    const apiKey = process.env.AI_API_KEY || process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('No AI API key configured, skipping AI validation');
        return { has_warnings: false, warnings: [] };
    }

    try {
        let prompt = '';
        
        if (validationType === 'regulatory') {
            prompt = `You are validating ${table} records for regulatory compliance in an insurance platform.

For each record, check:
1. If the entity name matches known registered entities in the specified country
2. If required regulatory identifiers are present and valid
3. If the entity type and category are consistent with regulations
4. Any suspicious or potentially fraudulent data

Records to validate:
${JSON.stringify(records, null, 2)}

Return ONLY valid JSON (no markdown, no explanation):
{"has_warnings": boolean, "warnings": [{"row": number, "field": string, "message": string, "severity": "error"|"warning"|"info", "verification_url": string|null}]}`;
        } else {
            prompt = `Validate these ${table} records for a corporate insurance platform. Check for:
1. Invalid/misspelled company names (insurers, TPAs, corporates)
2. Invalid email formats
3. Invalid phone numbers
4. Suspicious or incorrect data
5. Missing critical fields
6. Invalid country/state/city names
7. Inconsistent data (e.g., industry type doesn't match corporate type)

Records: ${JSON.stringify(records)}

Return ONLY valid JSON (no markdown, no explanation):
{"has_warnings": boolean, "warnings": [{"row": number, "field": string, "message": string, "severity": "error"|"warning"|"info"}]}`;
        }

        let response;

        if (provider === 'claude' || provider === 'anthropic') {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const result = await response.json();
            const content = result.content?.[0]?.text || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());

        } else if (provider === 'openai') {
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());

        } else if (provider === 'gemini') {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const result = await response.json();
            const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '{"has_warnings": false, "warnings": []}';
            return JSON.parse(content.replace(/```json|```/g, '').trim());

        } else if (provider === 'groq') {
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: process.env.AI_MODEL || 'llama3-8b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{"has_warnings": false, "warnings": []}';
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
// GET TABLE SCHEMA (Dynamic)
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
// GET ALL RECORDS (with search fix)
// =====================================================
router.get('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { page = 1, limit = 100, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // First get all records
        let query = supabase
            .from(table)
            .select('*', { count: 'exact' });

        const { data: allData, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Apply search filter in memory (works for all tables regardless of column names)
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

        // Log view action
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
// DOWNLOAD ALL DATA (for selected table)
// =====================================================
router.get('/masters/:table/download/all', async (req, res) => {
    try {
        const { table } = req.params;

        // Fetch ALL records (no pagination)
        const { data, error } = await supabase
            .from(table)
            .select('*');

        if (error) throw error;

        // Log download action
        await logAudit(req, {
            action_type: 'DOWNLOAD',
            target_table: table,
            record_id: null,
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
                } catch (e) {
                    // Skip if table doesn't exist
                }
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
                'account_manager_id': { table: 'account_managers', pk: 'manager_id', display: 'name' }
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
// GET REGULATORY AUTHORITIES
// =====================================================
router.get('/masters/regulatory/authorities', async (req, res) => {
    try {
        const { entity_type, country } = req.query;

        let query = supabase
            .from('regulatory_authorities')
            .select('*')
            .eq('is_active', true);

        if (entity_type) query = query.eq('entity_type', entity_type);
        if (country) query = query.eq('country', country);

        const { data, error } = await query;

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching regulatory authorities:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

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

        // Audit log
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
// BULK CREATE RECORDS
// =====================================================
router.post('/masters/:table/bulk', async (req, res) => {
    try {
        const { table } = req.params;
        const { records, skip_ai_validation = false, ai_warnings_ignored = false, ai_warning_text = null } = req.body;
        const pk = await getPrimaryKey(table);

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'No records provided' });
        }

        // AI Validation
        let aiResult = { has_warnings: false, warnings: [] };
        if (!skip_ai_validation) {
            aiResult = await performAIValidation(table, records);
            if (aiResult.has_warnings && !ai_warnings_ignored) {
                return res.status(200).json({
                    success: false,
                    requires_confirmation: true,
                    validation: aiResult
                });
            }
        }

        // Remove primary keys
        const cleanRecords = records.map(r => {
            const copy = { ...r };
            delete copy[pk];
            return copy;
        });

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < cleanRecords.length; i++) {
            const { error } = await supabase.from(table).insert([cleanRecords[i]]);
            if (error) {
                results.failed++;
                results.errors.push({ row: i + 1, error: error.message });
            } else {
                results.success++;
            }
        }

        // Audit log
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
        if (updates.updated_at !== undefined) {
            updates.updated_at = new Date().toISOString();
        }

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

        // Audit log
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

        // Get old record for audit
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

        // Audit log
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
// AI VALIDATION ENDPOINT (Manual trigger)
// =====================================================
router.post('/masters/:table/validate', async (req, res) => {
    try {
        const { table } = req.params;
        const { records } = req.body;

        const result = await performAIValidation(table, records);

        // Audit log
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

        // Validate in batches of 20 to avoid token limits
        const batchSize = 20;
        const allWarnings = [];

        for (let i = 0; i < allRecords.length; i += batchSize) {
            const batch = allRecords.slice(i, i + batchSize);
            const result = await performAIValidation(table, batch);
            
            if (result.warnings) {
                // Adjust row numbers for the full dataset
                const adjustedWarnings = result.warnings.map(w => ({
                    ...w,
                    row: w.row + i // Adjust row number based on batch offset
                }));
                allWarnings.push(...adjustedWarnings);
            }
        }

        // Audit log
        await logAudit(req, {
            action_type: 'AI_VALIDATE',
            target_table: table,
            new_values: { total_records: allRecords.length, warnings_count: allWarnings.length },
            ai_validation_ran: true,
            ai_warnings_found: allWarnings.length > 0,
            ai_warning_text: allWarnings.length > 0 ? JSON.stringify(allWarnings.slice(0, 50)) : null // Limit stored warnings
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
// REGULATORY VALIDATION FOR SPECIFIC ENTITY
// =====================================================
router.post('/masters/:table/validate-regulatory', async (req, res) => {
    try {
        const { table } = req.params;
        const { record, country } = req.body;

        // Get regulatory authority for this entity type and country
        let entityType = null;
        if (table === 'insurers') entityType = 'INSURER';
        else if (table === 'tpas') entityType = 'TPA';
        else if (table === 'tenants') entityType = 'CORPORATE';

        let authorityUrl = null;
        if (entityType && country) {
            const { data: authority } = await supabase
                .from('regulatory_authorities')
                .select('verification_url, authority_name')
                .eq('entity_type', entityType)
                .eq('country', country)
                .eq('is_active', true)
                .single();

            authorityUrl = authority?.verification_url;
        }

        // Perform AI regulatory validation
        const result = await performAIValidation(table, [{ ...record, country }], 'regulatory');

        // Add verification URL to warnings
        if (result.warnings) {
            result.warnings = result.warnings.map(w => ({
                ...w,
                verification_url: w.verification_url || authorityUrl
            }));
        }

        res.json({ success: true, ...result, regulatory_authority_url: authorityUrl });
    } catch (error) {
        console.error('Regulatory validation error:', error);
        res.json({ success: true, has_warnings: false, warnings: [], regulatory_authority_url: null });
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

        // Validate column name (alphanumeric and underscores only)
        if (!/^[a-z][a-z0-9_]*$/.test(column_name)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Column name must start with a letter and contain only lowercase letters, numbers, and underscores' 
            });
        }

        // Map friendly types to PostgreSQL types
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

        // Build SQL
        const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${column_name} ${pgType} ${nullable} ${defaultClause}`.trim();

        // Execute via RPC (requires a function in Supabase)
        const { error } = await supabase.rpc('execute_ddl', { sql_statement: sql });

        if (error) {
            // If RPC doesn't exist, return the SQL for manual execution
            if (error.message.includes('function') || error.message.includes('does not exist')) {
                return res.json({
                    success: false,
                    message: 'DDL function not available. Please run this SQL manually in Supabase:',
                    sql: sql
                });
            }
            throw error;
        }

        // Add column comment if description provided
        if (description) {
            await supabase.rpc('execute_ddl', { 
                sql_statement: `COMMENT ON COLUMN public.${table}.${column_name} IS '${description}'` 
            });
        }

        // Audit log
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
