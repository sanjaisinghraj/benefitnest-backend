// =====================================================
// BENEFITNEST - CORPORATE MANAGEMENT ROUTES (FIXED)
// File: corporates.routes.js
// Description: API for corporate management - UPDATED to remove deleted columns
// =====================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const sanitizeString = (str) => str?.toString().trim() || null;
const sanitizeCode = (str) => str?.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
const sanitizeSubdomain = (str) => str?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || null;

// Build dynamic filter query - FIXED: removed deleted columns
const applyFilters = (query, filters) => {
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.industry_type) {
        query = query.eq('industry_type', filters.industry_type);
    }
    if (filters.corporate_type) {
        query = query.eq('corporate_type', filters.corporate_type);
    }
    if (filters.broker_id) {
        query = query.eq('broker_id', filters.broker_id);
    }
    if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
    }
    // Contract expiring filter
    if (filters.contract_expiring_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(filters.contract_expiring_days));
        query = query.lte('contract_end_date', expiryDate.toISOString().split('T')[0]);
        query = query.gte('contract_end_date', new Date().toISOString().split('T')[0]);
    }
    return query;
};

// Log activity helper
const logActivity = async (tenantId, activityType, description, extras = {}) => {
    try {
        await supabase.from('corporate_activity_log').insert({
            tenant_id: tenantId,
            activity_type: activityType,
            description: description,
            entity_type: extras.entity_type || null,
            entity_id: extras.entity_id || null,
            old_values: extras.old_values || null,
            new_values: extras.new_values || null,
            performed_by: extras.performed_by || null,
            performed_by_type: extras.performed_by_type || 'SYSTEM',
            ip_address: extras.ip_address || null
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

// =====================================================
// GET ALL CORPORATES (FIXED - removed deleted columns)
// =====================================================
router.get('/corporates', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 1000,
            sort_by = 'created_at',
            sort_order = 'desc',
            search = '',
            status,
            industry_type,
            corporate_type,
            broker_id,
            contract_expiring_days,
            tags,
            view = 'list'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // FIXED: Removed account_manager join (column deleted)
        let query = supabase
            .from('tenants')
            .select(`
                *,
                broker:brokers(broker_id, broker_name, broker_code)
            `, { count: 'exact' });

        // FIXED: Removed corporate_group_name from search (column deleted)
        if (search) {
            query = query.or(`tenant_code.ilike.%${search}%,subdomain.ilike.%${search}%,corporate_legal_name.ilike.%${search}%,industry_type.ilike.%${search}%`);
        }

        // Apply filters - FIXED: removed deleted column filters
        const filters = {
            status, 
            industry_type, 
            corporate_type,
            broker_id, 
            contract_expiring_days,
            tags: tags ? tags.split(',') : null
        };
        query = applyFilters(query, filters);

        // FIXED: Removed employee_count and total_premium from valid sort fields
        const validSortFields = [
            'created_at', 'corporate_legal_name', 'tenant_code', 'status',
            'health_score', 'contract_end_date'
        ];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        query = query.order(sortField, { ascending: sort_order === 'asc' });

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching corporates:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch corporates',
                error: error.message
            });
        }

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error in GET /corporates:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// GET CORPORATE STATISTICS (FIXED)
// =====================================================
router.get('/corporates/statistics', async (req, res) => {
    try {
        const { broker_id } = req.query;

        // Get counts by status
        const statuses = ['ACTIVE', 'INACTIVE', 'ON_HOLD'];
        const statusCounts = {};
        for (const status of statuses) {
            let query = supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', status);
            if (broker_id) query = query.eq('broker_id', broker_id);
            const { count } = await query;
            statusCounts[status] = count || 0;
        }

        // Get total count
        let totalQuery = supabase.from('tenants').select('*', { count: 'exact', head: true });
        if (broker_id) totalQuery = totalQuery.eq('broker_id', broker_id);
        const { count: totalCount } = await totalQuery;

        // Get contracts expiring soon (next 90 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        let expiringQuery = supabase.from('tenants')
            .select('*', { count: 'exact', head: true })
            .lte('contract_end_date', expiryDate.toISOString().split('T')[0])
            .gte('contract_end_date', new Date().toISOString().split('T')[0]);
        if (broker_id) expiringQuery = expiringQuery.eq('broker_id', broker_id);
        const { count: expiringCount } = await expiringQuery;

        // Get health score distribution
        const healthRanges = [
            { label: 'Healthy (80-100)', min: 80, max: 100 },
            { label: 'Moderate (60-79)', min: 60, max: 79 },
            { label: 'At Risk (40-59)', min: 40, max: 59 },
            { label: 'Critical (0-39)', min: 0, max: 39 }
        ];
        const healthDistribution = [];
        for (const range of healthRanges) {
            let query = supabase.from('tenants')
                .select('*', { count: 'exact', head: true })
                .gte('health_score', range.min)
                .lte('health_score', range.max);
            if (broker_id) query = query.eq('broker_id', broker_id);
            const { count } = await query;
            healthDistribution.push({ ...range, count: count || 0 });
        }

        res.json({
            success: true,
            data: {
                total: totalCount || 0,
                by_status: statusCounts,
                expiring_soon: expiringCount || 0,
                health_distribution: healthDistribution
            }
        });

    } catch (error) {
        console.error('Error in GET /corporates/statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// GET SINGLE CORPORATE (FIXED - removed deleted joins)
// =====================================================
router.get('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include } = req.query;

        // FIXED: Removed account_manager and parent joins (columns deleted)
        const { data: corporate, error } = await supabase
            .from('tenants')
            .select(`
                *,
                broker:brokers(broker_id, broker_name, broker_code, logo_url)
            `)
            .eq('tenant_id', id)
            .single();

        if (error) {
            console.error('Error fetching corporate:', error);
            return res.status(404).json({
                success: false,
                message: 'Corporate not found'
            });
        }

        const response = { ...corporate };
        const includes = include ? include.split(',') : [];

        if (includes.includes('contacts') || includes.includes('all')) {
            const { data: contacts } = await supabase
                .from('corporate_contacts')
                .select('*')
                .eq('tenant_id', id)
                .eq('status', 'ACTIVE')
                .order('is_primary', { ascending: false });
            response.contacts = contacts || [];
        }

        if (includes.includes('documents') || includes.includes('all')) {
            const { data: documents } = await supabase
                .from('corporate_documents')
                .select('*')
                .eq('tenant_id', id)
                .eq('status', 'ACTIVE')
                .order('uploaded_at', { ascending: false })
                .limit(10);
            response.documents = documents || [];
        }

        if (includes.includes('contracts') || includes.includes('all')) {
            const { data: contracts } = await supabase
                .from('corporate_contracts')
                .select('*')
                .eq('tenant_id', id)
                .order('effective_date', { ascending: false });
            response.contracts = contracts || [];
        }

        if (includes.includes('notes') || includes.includes('all')) {
            const { data: notes } = await supabase
                .from('corporate_notes')
                .select('*')
                .eq('tenant_id', id)
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false })
                .limit(20);
            response.notes = notes || [];
        }

        if (includes.includes('activity') || includes.includes('all')) {
            const { data: activity } = await supabase
                .from('corporate_activity_log')
                .select('*')
                .eq('tenant_id', id)
                .order('created_at', { ascending: false })
                .limit(50);
            response.activity = activity || [];
        }

        if (includes.includes('policies') || includes.includes('all')) {
            const { data: policies } = await supabase
                .from('policies')
                .select('*')
                .eq('tenant_id', id)
                .order('start_date', { ascending: false });
            response.policies = policies || [];
        }

        if (includes.includes('stats') || includes.includes('all')) {
            const { count: employeeCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', id);

            const { count: activeEmployeeCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', id)
                .eq('status', 'ACTIVE');

            const { count: policyCount } = await supabase
                .from('policies')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', id)
                .eq('status', 'ACTIVE');

            const { count: claimCount } = await supabase
                .from('claims')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', id);

            response.stats = {
                employees: employeeCount || 0,
                active_employees: activeEmployeeCount || 0,
                policies: policyCount || 0,
                claims: claimCount || 0
            };
        }

        res.json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Error in GET /corporates/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// CREATE CORPORATE (FIXED - removed deleted columns)
// =====================================================
router.post('/corporates', async (req, res) => {
    try {
        const {
            tenant_code,
            subdomain,
            corporate_legal_name,
            corporate_type,
            industry_type,
            broker_id,
            address,
            contact_details,
            registration_details,
            contract_start_date,
            contract_end_date,
            contract_value,
            branding_config,
            tags,
            internal_notes,
            country
        } = req.body;

        // Validation
        if (!tenant_code || !subdomain || !corporate_legal_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tenant_code, subdomain, corporate_legal_name'
            });
        }

        const cleanCode = sanitizeCode(tenant_code);
        const cleanSubdomain = sanitizeSubdomain(subdomain);

        // Check for duplicates
        const { data: existing } = await supabase
            .from('tenants')
            .select('tenant_id')
            .or(`tenant_code.eq.${cleanCode},subdomain.eq.${cleanSubdomain}`)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Tenant code or subdomain already exists'
            });
        }

        // FIXED: Only include columns that exist in the table
        const corporateData = {
            tenant_code: cleanCode,
            subdomain: cleanSubdomain,
            corporate_legal_name: sanitizeString(corporate_legal_name),
            corporate_type: sanitizeString(corporate_type),
            industry_type: sanitizeString(industry_type),
            broker_id: broker_id || null,
            address: address || null,
            contact_details: contact_details || null,
            registration_details: registration_details || null,
            contract_start_date: contract_start_date || null,
            contract_end_date: contract_end_date || null,
            contract_value: contract_value || null,
            branding_config: branding_config || null,
            tags: tags || [],
            internal_notes: sanitizeString(internal_notes),
            country: country || 'India',
            status: 'ACTIVE',
            health_score: 100,
            created_by: req.user?.user_id || null
        };

        const { data: corporate, error } = await supabase
            .from('tenants')
            .insert([corporateData])
            .select()
            .single();

        if (error) {
            console.error('Error creating corporate:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create corporate',
                error: error.message
            });
        }

        // Log activity
        await logActivity(
            corporate.tenant_id,
            'CREATED',
            `Corporate "${corporate.corporate_legal_name}" created`,
            {
                performed_by: req.user?.user_id,
                performed_by_type: 'ADMIN',
                ip_address: req.ip
            }
        );

        res.status(201).json({
            success: true,
            message: 'Corporate created successfully',
            data: corporate
        });

    } catch (error) {
        console.error('Error in POST /corporates:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// UPDATE CORPORATE (FIXED - removed deleted columns)
// =====================================================
router.put('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const { data: current } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', id)
            .single();

        if (!current) {
            return res.status(404).json({
                success: false,
                message: 'Corporate not found'
            });
        }

        // FIXED: Only include columns that exist in the table
        const allowedFields = [
            'corporate_legal_name', 'corporate_type', 'industry_type',
            'broker_id', 'address', 'contact_details', 'registration_details', 
            'branding_config', 'contract_start_date', 'contract_end_date', 
            'contract_value', 'portal_url', 'compliance_status',
            'health_score', 'health_factors', 'tags', 'internal_notes',
            'status', 'country'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates[field] = updateData[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updates.updated_at = new Date().toISOString();

        const { data: corporate, error } = await supabase
            .from('tenants')
            .update(updates)
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating corporate:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update corporate',
                error: error.message
            });
        }

        // Log activity
        await logActivity(
            id,
            'UPDATED',
            `Corporate "${corporate.corporate_legal_name}" updated`,
            {
                old_values: current,
                new_values: updates,
                performed_by: req.user?.user_id,
                performed_by_type: 'ADMIN',
                ip_address: req.ip
            }
        );

        res.json({
            success: true,
            message: 'Corporate updated successfully',
            data: corporate
        });

    } catch (error) {
        console.error('Error in PUT /corporates/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// DELETE CORPORATE
// =====================================================
router.delete('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hard_delete = false } = req.query;

        const { data: corporate } = await supabase
            .from('tenants')
            .select('tenant_id, corporate_legal_name')
            .eq('tenant_id', id)
            .single();

        if (!corporate) {
            return res.status(404).json({
                success: false,
                message: 'Corporate not found'
            });
        }

        if (hard_delete === 'true') {
            const { error } = await supabase
                .from('tenants')
                .delete()
                .eq('tenant_id', id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete corporate',
                    error: error.message
                });
            }
        } else {
            const { error } = await supabase
                .from('tenants')
                .update({ status: 'DELETED', updated_at: new Date().toISOString() })
                .eq('tenant_id', id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete corporate',
                    error: error.message
                });
            }
        }

        await logActivity(
            id,
            'DELETED',
            `Corporate "${corporate.corporate_legal_name}" deleted`,
            {
                performed_by: req.user?.user_id,
                performed_by_type: 'ADMIN',
                ip_address: req.ip
            }
        );

        res.json({
            success: true,
            message: 'Corporate deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /corporates/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// CORPORATE CONTACTS ROUTES
// =====================================================

router.get('/corporates/:id/contacts', async (req, res) => {
    try {
        const { id } = req.params;
        const { status = 'ACTIVE' } = req.query;

        let query = supabase
            .from('corporate_contacts')
            .select('*')
            .eq('tenant_id', id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: false });

        if (status !== 'ALL') {
            query = query.eq('status', status);
        }

        const { data: contacts, error } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch contacts',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: contacts || []
        });

    } catch (error) {
        console.error('Error in GET /corporates/:id/contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.post('/corporates/:id/contacts', async (req, res) => {
    try {
        const { id } = req.params;
        const contactData = req.body;

        const { data: contact, error } = await supabase
            .from('corporate_contacts')
            .insert([{
                tenant_id: id,
                full_name: sanitizeString(contactData.full_name),
                email: sanitizeString(contactData.email),
                phone: sanitizeString(contactData.phone),
                mobile: sanitizeString(contactData.mobile),
                designation: sanitizeString(contactData.designation),
                department: sanitizeString(contactData.department),
                job_level: sanitizeString(contactData.job_level),
                contact_role: contactData.contact_role || 'GENERAL',
                is_primary: contactData.is_primary || false,
                is_decision_maker: contactData.is_decision_maker || false,
                can_approve_claims: contactData.can_approve_claims || false,
                can_manage_employees: contactData.can_manage_employees || false,
                can_view_reports: contactData.can_view_reports || false,
                can_manage_billing: contactData.can_manage_billing || false,
                preferred_channel: contactData.preferred_channel || 'EMAIL',
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add contact',
                error: error.message
            });
        }

        await logActivity(
            id,
            'CONTACT_ADDED',
            `Contact "${contactData.full_name}" added`,
            {
                entity_type: 'CONTACT',
                entity_id: contact.contact_id,
                performed_by: req.user?.user_id
            }
        );

        res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            data: contact
        });

    } catch (error) {
        console.error('Error in POST /corporates/:id/contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.put('/corporates/:id/contacts/:contactId', async (req, res) => {
    try {
        const { id, contactId } = req.params;
        const updateData = req.body;

        const { data: contact, error } = await supabase
            .from('corporate_contacts')
            .update(updateData)
            .eq('contact_id', contactId)
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update contact',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: contact
        });

    } catch (error) {
        console.error('Error in PUT /corporates/:id/contacts/:contactId:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.delete('/corporates/:id/contacts/:contactId', async (req, res) => {
    try {
        const { id, contactId } = req.params;

        const { error } = await supabase
            .from('corporate_contacts')
            .update({ status: 'INACTIVE' })
            .eq('contact_id', contactId)
            .eq('tenant_id', id);

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete contact',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /corporates/:id/contacts/:contactId:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// CORPORATE NOTES ROUTES
// =====================================================

router.get('/corporates/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const { data: notes, error, count } = await supabase
            .from('corporate_notes')
            .select('*', { count: 'exact' })
            .eq('tenant_id', id)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notes',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: notes || [],
            total: count
        });

    } catch (error) {
        console.error('Error in GET /corporates/:id/notes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.post('/corporates/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const noteData = req.body;

        const { data: note, error } = await supabase
            .from('corporate_notes')
            .insert([{
                tenant_id: id,
                note_type: noteData.note_type || 'GENERAL',
                title: sanitizeString(noteData.title),
                content: noteData.content,
                related_entity: noteData.related_entity || null,
                related_entity_id: noteData.related_entity_id || null,
                priority: noteData.priority || 'NORMAL',
                requires_followup: noteData.requires_followup || false,
                followup_date: noteData.followup_date || null,
                is_private: noteData.is_private || false,
                visible_to_client: noteData.visible_to_client || false,
                created_by: req.user?.user_id,
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add note',
                error: error.message
            });
        }

        await logActivity(
            id,
            'NOTE_ADDED',
            `Note added: ${noteData.title || 'Untitled'}`,
            {
                entity_type: 'NOTE',
                entity_id: note.note_id,
                performed_by: req.user?.user_id
            }
        );

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: note
        });

    } catch (error) {
        console.error('Error in POST /corporates/:id/notes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// CORPORATE ACTIVITY LOG
// =====================================================

router.get('/corporates/:id/activity', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0, activity_type } = req.query;

        let query = supabase
            .from('corporate_activity_log')
            .select('*', { count: 'exact' })
            .eq('tenant_id', id)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (activity_type) {
            query = query.eq('activity_type', activity_type);
        }

        const { data: activity, error, count } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch activity',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: activity || [],
            total: count
        });

    } catch (error) {
        console.error('Error in GET /corporates/:id/activity:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// EXPORT
// =====================================================


// =====================================================
// GET TENANTS TABLE SCHEMA (for dynamic form fields)
// =====================================================
router.get('/corporates/schema/fields', async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_table_columns', { 
            table_name: 'tenants' 
        });
        
        // If RPC doesn't exist, use raw query
        if (error) {
            const { data: columns, error: colError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable, column_default')
                .eq('table_name', 'tenants')
                .eq('table_schema', 'public');
            
            if (colError) {
                // Fallback: return hardcoded known columns
                return res.json({
                    success: true,
                    data: {
                        core_fields: [
                            'tenant_id', 'tenant_code', 'subdomain', 'status',
                            'corporate_legal_name', 'corporate_type', 'industry_type', 'country',
                            'address', 'contact_details', 'documents', 'benefitnest_manager',
                            'registration_details', 'branding_config', 'broker_id',
                            'contract_start_date', 'contract_end_date', 'contract_value',
                            'compliance_status', 'portal_url', 'health_score', 'health_factors',
                            'tags', 'internal_notes', 'ai_scan_skipped', 'ai_observations',
                            'created_at', 'updated_at', 'last_activity_at', 'created_by', 'updated_by'
                        ],
                        system_fields: ['tenant_id', 'created_at', 'updated_at', 'last_activity_at', 'created_by', 'updated_by'],
                        jsonb_fields: ['address', 'contact_details', 'documents', 'benefitnest_manager', 'registration_details', 'branding_config', 'health_factors', 'ai_observations']
                    }
                });
            }
            
            return res.json({
                success: true,
                data: columns
            });
        }
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching schema:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schema',
            error: error.message
        });
    }
});

// =====================================================
// AI VALIDATION ENDPOINT
// =====================================================
router.post('/corporates/validate', async (req, res) => {
    try {
        const { corporate_legal_name, country, industry_type, registration_details } = req.body;
        
        const issues = [];
        const suggestions = [];
        
        // Validate corporate name based on country
        if (corporate_legal_name && country) {
            const name = corporate_legal_name.toLowerCase();
            
            if (country === 'India') {
                // Indian company validations
                const validSuffixes = ['private limited', 'pvt ltd', 'pvt. ltd.', 'limited', 'ltd', 'llp', 'opc'];
                const hasSuffix = validSuffixes.some(s => name.includes(s));
                if (!hasSuffix) {
                    issues.push({
                        field: 'corporate_legal_name',
                        severity: 'warning',
                        message: 'Indian company names typically end with Private Limited, LLP, or similar suffix',
                        suggestion: `${corporate_legal_name} Private Limited`
                    });
                }
                
                // Check for special characters
                if (/[^a-zA-Z0-9\s&.,()-]/.test(corporate_legal_name)) {
                    issues.push({
                        field: 'corporate_legal_name',
                        severity: 'error',
                        message: 'Company name contains invalid special characters'
                    });
                }
            }
            
            if (country === 'USA') {
                const validSuffixes = ['inc', 'inc.', 'incorporated', 'llc', 'corp', 'corporation', 'co', 'company'];
                const hasSuffix = validSuffixes.some(s => name.includes(s));
                if (!hasSuffix) {
                    issues.push({
                        field: 'corporate_legal_name',
                        severity: 'warning',
                        message: 'US company names typically end with Inc, LLC, Corp, etc.',
                        suggestion: `${corporate_legal_name}, Inc.`
                    });
                }
            }
        }
        
        // Validate registration details
        if (registration_details && country === 'India') {
            const { pan, gstin, cin } = registration_details;
            
            // PAN validation (AAAAA9999A format)
            if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
                issues.push({
                    field: 'registration_details.pan',
                    severity: 'error',
                    message: 'Invalid PAN format. Expected: AAAAA9999A'
                });
            }
            
            // GSTIN validation (15 characters)
            if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase())) {
                issues.push({
                    field: 'registration_details.gstin',
                    severity: 'error',
                    message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5'
                });
            }
            
            // CIN validation (21 characters)
            if (cin && cin.length !== 21) {
                issues.push({
                    field: 'registration_details.cin',
                    severity: 'warning',
                    message: 'CIN should be 21 characters long'
                });
            }
        }
        
        // Check for duplicate corporate name
        const { data: existing } = await supabase
            .from('tenants')
            .select('tenant_id, corporate_legal_name')
            .ilike('corporate_legal_name', `%${corporate_legal_name}%`)
            .limit(5);
        
        if (existing && existing.length > 0) {
            issues.push({
                field: 'corporate_legal_name',
                severity: 'warning',
                message: `Similar corporate names found: ${existing.map(e => e.corporate_legal_name).join(', ')}`
            });
        }
        
        res.json({
            success: true,
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            suggestions
        });
        
    } catch (error) {
        console.error('Error in AI validation:', error);
        res.status(500).json({
            success: false,
            message: 'AI validation failed',
            error: error.message
        });
    }
});

// =====================================================
// CHECK PORTAL URL EXISTS
// =====================================================
router.get('/corporates/:id/check-portal', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: corporate } = await supabase
            .from('tenants')
            .select('subdomain, portal_url')
            .eq('tenant_id', id)
            .single();
        
        if (!corporate) {
            return res.status(404).json({
                success: false,
                message: 'Corporate not found'
            });
        }
        
        // Check if portal files exist (this would check your file system or storage)
        const portalPath = `/tenants/${corporate.subdomain}`;
        const portalExists = false; // TODO: Implement actual check
        
        res.json({
            success: true,
            data: {
                subdomain: corporate.subdomain,
                portal_url: corporate.portal_url || `https://${corporate.subdomain}.benefitnest.space`,
                portal_exists: portalExists,
                needs_creation: !portalExists
            }
        });
        
    } catch (error) {
        console.error('Error checking portal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check portal',
            error: error.message
        });
    }
});

// =====================================================
// CREATE PORTAL FOR CORPORATE
// =====================================================
router.post('/corporates/:id/create-portal', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: corporate } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', id)
            .single();
        
        if (!corporate) {
            return res.status(404).json({
                success: false,
                message: 'Corporate not found'
            });
        }
        
        // Generate portal configuration
        const portalConfig = {
            tenant_id: corporate.tenant_id,
            subdomain: corporate.subdomain,
            branding: corporate.branding_config || {
                primary_color: '#2563eb',
                secondary_color: '#10b981',
                logo_url: null,
                company_name: corporate.corporate_legal_name
            },
            created_at: new Date().toISOString()
        };
        
        // Update corporate with portal URL
        const portalUrl = `https://${corporate.subdomain}.benefitnest.space`;
        
        await supabase
            .from('tenants')
            .update({ 
                portal_url: portalUrl,
                updated_at: new Date().toISOString()
            })
            .eq('tenant_id', id);
        
        // Log activity
        await logActivity(id, 'PORTAL_CREATED', `Portal created: ${portalUrl}`);
        
        res.json({
            success: true,
            message: 'Portal created successfully',
            data: {
                portal_url: portalUrl,
                config: portalConfig
            }
        });
        
    } catch (error) {
        console.error('Error creating portal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create portal',
            error: error.message
        });
    }
});


module.exports = router;
