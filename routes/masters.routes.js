// =====================================================
// BENEFITNEST - MASTERS MANAGEMENT ROUTES (FULLY DYNAMIC)
// =====================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================================
// GET PRIMARY KEY FOR ANY TABLE (Dynamic)
// =====================================================
const getPrimaryKey = async (table) => {
    const { data, error } = await supabase.rpc('get_primary_key', { p_table: table });
    if (error || !data) return 'id';
    return data;
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
// GET ALL RECORDS (Dynamic)
// =====================================================
router.get('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { page = 1, limit = 100 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .range(offset, offset + parseInt(limit) - 1);

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
        console.error('Error fetching records:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET SINGLE RECORD (Dynamic PK)
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
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// CHECK DEPENDENCIES (Dynamic)
// =====================================================
router.get('/masters/:table/:id/dependencies', async (req, res) => {
    try {
        const { table, id } = req.params;
        const pk = await getPrimaryKey(table);

        // Get foreign key references dynamically
        const { data: fkData } = await supabase.rpc('get_foreign_key_references', {
            p_table: table,
            p_column: pk
        });

        const dependencies = [];
        if (fkData && fkData.length > 0) {
            for (const fk of fkData) {
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
// CREATE RECORD
// =====================================================
router.post('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const record = req.body;
        const pk = await getPrimaryKey(table);

        // Remove primary key if present (let DB generate)
        delete record[pk];

        const { data, error } = await supabase
            .from(table)
            .insert([record])
            .select()
            .single();

        if (error) throw error;

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
        const { records } = req.body;
        const pk = await getPrimaryKey(table);

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'No records provided' });
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
// UPDATE RECORD (Dynamic PK)
// =====================================================
router.put('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const updates = req.body;
        const pk = await getPrimaryKey(table);

        // Don't update primary key or timestamps
        delete updates[pk];
        delete updates.created_at;
        if (updates.updated_at !== undefined) {
            updates.updated_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq(pk, id)
            .select()
            .single();

        if (error) throw error;

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
// DELETE RECORD (Dynamic PK)
// =====================================================
router.delete('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const pk = await getPrimaryKey(table);

        const { error } = await supabase
            .from(table)
            .delete()
            .eq(pk, id);

        if (error) throw error;

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
// AI VALIDATION
// =====================================================
router.post('/masters/:table/validate', async (req, res) => {
    try {
        const { table } = req.params;
        const { records } = req.body;

        // Use Claude API if available
        if (process.env.CLAUDE_API_KEY) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: `Validate these ${table} records for a corporate insurance platform. Check for:
1. Invalid/misspelled company names
2. Invalid email formats
3. Invalid phone numbers  
4. Suspicious or incorrect data
5. Missing critical fields

Records: ${JSON.stringify(records)}

Return JSON only: {"has_warnings": boolean, "warnings": [{"row": number, "field": string, "message": string}]}`
                    }]
                })
            });

            const aiResult = await response.json();
            const content = aiResult.content?.[0]?.text || '{"has_warnings": false, "warnings": []}';
            const validation = JSON.parse(content.replace(/```json|```/g, '').trim());
            
            return res.json({ success: true, ...validation });
        }

        // Fallback: no warnings
        res.json({ success: true, has_warnings: false, warnings: [] });
    } catch (error) {
        console.error('AI validation error:', error);
        res.json({ success: true, has_warnings: false, warnings: [] });
    }
});

module.exports = router;