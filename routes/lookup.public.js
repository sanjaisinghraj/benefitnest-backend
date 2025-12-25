// =====================================================
// LOOKUP TABLES API - /api/lookup
// File: routes/lookup.public.js
// =====================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// =====================================================
// GET /api/lookup/corporate-types
// =====================================================
router.get('/corporate-types', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('corporate_types')
            .select('id, code, name, description, country')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching corporate types:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch corporate types', error: error.message });
        }

        res.json({ success: true, data: data || [], count: data?.length || 0 });
    } catch (error) {
        console.error('Error in corporate-types endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

// =====================================================
// GET /api/lookup/industry-types
// =====================================================
router.get('/industry-types', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('industry_types')
            .select('id, code, name, description, sector')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching industry types:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch industry types', error: error.message });
        }

        res.json({ success: true, data: data || [], count: data?.length || 0 });
    } catch (error) {
        console.error('Error in industry-types endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

// =====================================================
// GET /api/lookup/job-levels
// =====================================================
router.get('/job-levels', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('job_levels')
            .select('id, code, name, description, level_rank, category')
            .eq('is_active', true)
            .order('level_rank', { ascending: false })
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching job levels:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch job levels', error: error.message });
        }

        res.json({ success: true, data: data || [], count: data?.length || 0 });
    } catch (error) {
        console.error('Error in job-levels endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

// =====================================================
// GET /api/lookup/all
// Fetch all lookup data in one call
// =====================================================
router.get('/all', async (req, res) => {
    try {
        const [corporateTypes, industryTypes, jobLevels] = await Promise.all([
            supabase
                .from('corporate_types')
                .select('id, code, name, description, country')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true }),
            supabase
                .from('industry_types')
                .select('id, code, name, description, sector')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true }),
            supabase
                .from('job_levels')
                .select('id, code, name, description, level_rank, category')
                .eq('is_active', true)
                .order('level_rank', { ascending: false })
                .order('display_order', { ascending: true })
        ]);

        if (corporateTypes.error || industryTypes.error || jobLevels.error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch lookup data',
                errors: {
                    corporateTypes: corporateTypes.error?.message,
                    industryTypes: industryTypes.error?.message,
                    jobLevels: jobLevels.error?.message
                }
            });
        }

        res.json({
            success: true,
            data: {
                corporateTypes: corporateTypes.data || [],
                industryTypes: industryTypes.data || [],
                jobLevels: jobLevels.data || []
            }
        });
    } catch (error) {
        console.error('Error in lookup/all endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
