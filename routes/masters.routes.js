// =====================================================
// BENEFITNEST - MASTERS MANAGEMENT ROUTES
// File: routes/masters.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Allowed master tables (security whitelist)
// Validate table name (allow all public tables)
const isValidTable = async (table) => {
    const { data } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
        .eq('table_name', table)
        .single();
    return !!data;
};

// =====================================================
// GET ALL MASTER TABLES LIST
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
// GET TABLE SCHEMA (columns)
// =====================================================
router.get('/masters/:table/schema', async (req, res) => {
    try {
        const { table } = req.params;
        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

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
// GET ALL RECORDS FROM A MASTER TABLE
// =====================================================
router.get('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const { page = 1, limit = 100, search = '', sort_by = 'created_at', sort_order = 'desc' } = req.query;

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from(table)
            .select('*', { count: 'exact' });

        // Apply search if provided (search in name/code columns if they exist)
        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }

        // Apply sorting
        query = query.order(sort_by, { ascending: sort_order === 'asc' });

        // Apply pagination
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
        console.error('Error fetching records:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// GET SINGLE RECORD
// =====================================================
router.get('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// CHECK DEPENDENCIES BEFORE DELETE/EDIT
// =====================================================
router.get('/masters/:table/:id/dependencies', async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        const dependencies = [];

        // Check common foreign key relationships
        const fkChecks = {
            'insurers': [
                { table: 'policies', column: 'insurer_id', label: 'Policies' },
                { table: 'tenants', column: 'insurer_id', label: 'Corporates' }
            ],
            'tpas': [
                { table: 'policies', column: 'tpa_id', label: 'Policies' }
            ],
            'brokers': [
                { table: 'tenants', column: 'broker_id', label: 'Corporates' }
            ],
            'account_managers': [
                { table: 'tenants', column: 'account_manager_id', label: 'Corporates' }
            ],
            'policy_type': [
                { table: 'policies', column: 'policy_type_id', label: 'Policies' },
                { table: 'policy_configuration', column: 'policy_type_id', label: 'Configurations' }
            ],
            'corporate_types': [
                { table: 'tenants', column: 'corporate_type', label: 'Corporates' }
            ],
            'industry_types': [
                { table: 'tenants', column: 'industry_type', label: 'Corporates' }
            ],
            'job_levels': [
                { table: 'employees', column: 'job_level', label: 'Employees' }
            ]
        };

        const checks = fkChecks[table] || [];

        for (const check of checks) {
            try {
                const { count } = await supabase
                    .from(check.table)
                    .select('*', { count: 'exact', head: true })
                    .eq(check.column, id);

                if (count > 0) {
                    dependencies.push({
                        table: check.table,
                        label: check.label,
                        count
                    });
                }
            } catch (e) {
                // Table might not exist, skip
            }
        }

        res.json({
            success: true,
            has_dependencies: dependencies.length > 0,
            dependencies
        });
    } catch (error) {
        console.error('Error checking dependencies:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =====================================================
// CREATE RECORD
// =====================================================
router.post('/masters/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const record = req.body;

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        // Remove id if present (let DB generate)
        delete record.id;

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

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'No records provided' });
        }

        // Remove ids
        const cleanRecords = records.map(r => {
            const { id, ...rest } = r;
            return rest;
        });

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < cleanRecords.length; i++) {
            const { error } = await supabase
                .from(table)
                .insert([cleanRecords[i]]);

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
// UPDATE RECORD
// =====================================================
router.put('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const updates = req.body;

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        // Don't update id or created_at
        delete updates.id;
        delete updates.created_at;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq('id', id)
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
// DELETE RECORD
// =====================================================
router.delete('/masters/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const { force = false } = req.query;

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        // Check dependencies first (unless force)
        if (!force) {
            const depResponse = await fetch(`${req.protocol}://${req.get('host')}/api/admin/masters/${table}/${id}/dependencies`);
            const depData = await depResponse.json();
            
            if (depData.has_dependencies) {
                return res.status(409).json({
                    success: false,
                    message: 'Cannot delete - record has dependencies',
                    dependencies: depData.dependencies
                });
            }
        }

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

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
// AI VALIDATION ENDPOINT
// =====================================================
router.post('/masters/:table/validate', async (req, res) => {
    try {
        const { table } = req.params;
        const { records } = req.body;

        if (!isValidTable(table)) {
            return res.status(403).json({ success: false, message: 'Table not allowed' });
        }

        const warnings = [];

        // Basic validation rules per table
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const row = i + 1;

            // Insurers validation
            if (table === 'insurers') {
                if (record.name && record.name.length < 3) {
                    warnings.push({ row, field: 'name', message: 'Insurer name seems too short' });
                }
                if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
                    warnings.push({ row, field: 'email', message: 'Invalid email format' });
                }
            }

            // TPAs validation
            if (table === 'tpas') {
                if (record.name && record.name.length < 3) {
                    warnings.push({ row, field: 'name', message: 'TPA name seems too short' });
                }
            }

            // Common validations
            if (record.code && !/^[A-Z0-9_]+$/.test(record.code)) {
                warnings.push({ row, field: 'code', message: 'Code should be uppercase alphanumeric' });
            }

            if (record.country && record.country.length < 2) {
                warnings.push({ row, field: 'country', message: 'Invalid country name' });
            }
        }

        res.json({
            success: true,
            has_warnings: warnings.length > 0,
            warnings
        });
    } catch (error) {
        console.error('Error validating:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;