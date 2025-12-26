// =====================================================
// BENEFITNEST - CORPORATE MANAGEMENT ROUTES (ENHANCED)
// File: corporates.routes.js
// Description: Comprehensive API for enterprise-grade corporate management
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

// Sanitize and validate inputs
const sanitizeString = (str) => str?.toString().trim() || null;
const sanitizeCode = (str) => str?.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
const sanitizeSubdomain = (str) => str?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || null;

// Build dynamic filter query
const applyFilters = (query, filters) => {
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.onboarding_status) {
        query = query.eq('onboarding_status', filters.onboarding_status);
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
    if (filters.account_manager_id) {
        query = query.eq('account_manager_id', filters.account_manager_id);
    }
    if (filters.is_favorite !== undefined) {
        query = query.eq('is_favorite', filters.is_favorite === 'true');
    }
    if (filters.health_score_min) {
        query = query.gte('health_score', parseInt(filters.health_score_min));
    }
    if (filters.health_score_max) {
        query = query.lte('health_score', parseInt(filters.health_score_max));
    }
    if (filters.contract_expiring_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(filters.contract_expiring_days));
        query = query.lte('contract_end_date', expiryDate.toISOString().split('T')[0]);
        query = query.gte('contract_end_date', new Date().toISOString().split('T')[0]);
    }
    if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
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
// GET ALL CORPORATES (with advanced filtering & pagination)
// =====================================================
router.get('/corporates', async (req, res) => {
    try {
        const {
            // Pagination
            page = 1,
            limit = 1000,
            
            // Sorting
            sort_by = 'created_at',
            sort_order = 'desc',
            
            // Search
            search = '',
            
            // Filters
            status,
            onboarding_status,
            industry_type,
            corporate_type,
            broker_id,
            account_manager_id,
            is_favorite,
            health_score_min,
            health_score_max,
            contract_expiring_days,
            tags,
            
            // View type
            view = 'list' // list, kanban, stats
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build base query
        let query = supabase
            .from('tenants')
            .select(`
                *,
                broker:brokers(broker_id, broker_name, broker_code),
                account_manager:account_managers(manager_id, full_name, email)
            `, { count: 'exact' });

        // Apply search
        if (search) {
            query = query.or(`
                tenant_code.ilike.%${search}%,
                subdomain.ilike.%${search}%,
                corporate_legal_name.ilike.%${search}%,
                corporate_group_name.ilike.%${search}%,
                industry_type.ilike.%${search}%
            `);
        }

        // Apply filters
        const filters = {
            status, onboarding_status, industry_type, corporate_type,
            broker_id, account_manager_id, is_favorite, health_score_min,
            health_score_max, contract_expiring_days, tags: tags ? tags.split(',') : null
        };
        query = applyFilters(query, filters);

        // Apply sorting
        const validSortFields = [
            'created_at', 'corporate_legal_name', 'tenant_code', 'status',
            'health_score', 'employee_count', 'contract_end_date', 'total_premium'
        ];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        query = query.order(sortField, { ascending: sort_order === 'asc' });

        // Apply pagination
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

        // Calculate pagination info
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
// GET CORPORATE STATISTICS (Dashboard)
// =====================================================
router.get('/corporates/statistics', async (req, res) => {
    try {
        const { broker_id, account_manager_id } = req.query;

        // Build filter conditions
        let filterConditions = '';
        if (broker_id) filterConditions += ` AND broker_id = '${broker_id}'`;
        if (account_manager_id) filterConditions += ` AND account_manager_id = '${account_manager_id}'`;

        // Get counts by status
        const { data: statusCounts } = await supabase
            .from('tenants')
            .select('status', { count: 'exact' })
            .then(async () => {
                const statuses = ['ACTIVE', 'INACTIVE', 'ON_HOLD'];
                const counts = {};
                for (const status of statuses) {
                    let query = supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', status);
                    if (broker_id) query = query.eq('broker_id', broker_id);
                    if (account_manager_id) query = query.eq('account_manager_id', account_manager_id);
                    const { count } = await query;
                    counts[status] = count || 0;
                }
                return { data: counts };
            });

        // Get counts by onboarding status
        const onboardingStatuses = ['LEAD', 'PROSPECT', 'PROPOSAL_SENT', 'NEGOTIATION', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'];
        const onboardingCounts = {};
        for (const status of onboardingStatuses) {
            let query = supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('onboarding_status', status);
            if (broker_id) query = query.eq('broker_id', broker_id);
            if (account_manager_id) query = query.eq('account_manager_id', account_manager_id);
            const { count } = await query;
            onboardingCounts[status] = count || 0;
        }

        // Get total count
        let totalQuery = supabase.from('tenants').select('*', { count: 'exact', head: true });
        if (broker_id) totalQuery = totalQuery.eq('broker_id', broker_id);
        if (account_manager_id) totalQuery = totalQuery.eq('account_manager_id', account_manager_id);
        const { count: totalCount } = await totalQuery;

        // Get contracts expiring soon (next 90 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        let expiringQuery = supabase.from('tenants')
            .select('*', { count: 'exact', head: true })
            .lte('contract_end_date', expiryDate.toISOString().split('T')[0])
            .gte('contract_end_date', new Date().toISOString().split('T')[0]);
        if (broker_id) expiringQuery = expiringQuery.eq('broker_id', broker_id);
        if (account_manager_id) expiringQuery = expiringQuery.eq('account_manager_id', account_manager_id);
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
            if (account_manager_id) query = query.eq('account_manager_id', account_manager_id);
            const { count } = await query;
            healthDistribution.push({ ...range, count: count || 0 });
        }

        // Get favorites count
        let favQuery = supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('is_favorite', true);
        if (broker_id) favQuery = favQuery.eq('broker_id', broker_id);
        if (account_manager_id) favQuery = favQuery.eq('account_manager_id', account_manager_id);
        const { count: favoritesCount } = await favQuery;

        res.json({
            success: true,
            data: {
                total: totalCount || 0,
                by_status: statusCounts?.data || {},
                by_onboarding_status: onboardingCounts,
                expiring_soon: expiringCount || 0,
                health_distribution: healthDistribution,
                favorites: favoritesCount || 0
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
// GET SINGLE CORPORATE (with full details)
// =====================================================
router.get('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include } = req.query; // contacts, documents, contracts, notes, activity

        // Get corporate basic details
        const { data: corporate, error } = await supabase
            .from('tenants')
            .select(`
                *,
                broker:brokers(broker_id, broker_name, broker_code, logo_url),
                account_manager:account_managers(manager_id, full_name, email, phone, designation),
                parent:tenants!parent_tenant_id(tenant_id, tenant_code, corporate_legal_name)
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

        // Prepare response
        const response = { ...corporate };

        // Include additional data based on request
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
            // Get employee stats
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
// CREATE CORPORATE
// =====================================================
router.post('/corporates', async (req, res) => {
    try {
        const {
            // Required fields
            tenant_code,
            subdomain,
            corporate_legal_name,
            
            // Basic info
            corporate_group_name,
            corporate_type,
            industry_type,
            
            // Hierarchy
            parent_tenant_id,
            
            // Relationships
            broker_id,
            account_manager_id,
            
            // Address
            address,
            
            // Registration
            registration_details,
            
            // Contract
            contract_start_date,
            contract_end_date,
            contract_value,
            billing_cycle,
            payment_terms,
            
            // Contacts (will be inserted separately)
            contacts,
            
            // Branding
            branding_config,
            
            // Optional
            lead_source,
            referral_code,
            campaign_id,
            tags,
            internal_notes
        } = req.body;

        // Validation
        if (!tenant_code || !subdomain || !corporate_legal_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tenant_code, subdomain, corporate_legal_name'
            });
        }

        // Sanitize
        const cleanCode = sanitizeCode(tenant_code);
        const cleanSubdomain = sanitizeSubdomain(subdomain);

        // Generate schema name
        const schema_name = `tenant_${cleanSubdomain}`;

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

        // Prepare corporate data
        const corporateData = {
            tenant_code: cleanCode,
            subdomain: cleanSubdomain,
            schema_name,
            corporate_legal_name: sanitizeString(corporate_legal_name),
            corporate_group_name: sanitizeString(corporate_group_name),
            corporate_type: sanitizeString(corporate_type),
            industry_type: sanitizeString(industry_type),
            parent_tenant_id: parent_tenant_id || null,
            broker_id: broker_id || null,
            account_manager_id: account_manager_id || null,
            address: address || null,
            registration_details: registration_details || null,
            contract_start_date: contract_start_date || null,
            contract_end_date: contract_end_date || null,
            contract_value: contract_value || null,
            billing_cycle: billing_cycle || 'ANNUAL',
            payment_terms: payment_terms || 30,
            branding_config: branding_config || null,
            lead_source: sanitizeString(lead_source),
            referral_code: sanitizeString(referral_code),
            campaign_id: sanitizeString(campaign_id),
            tags: tags || [],
            internal_notes: sanitizeString(internal_notes),
            status: 'ACTIVE',
            onboarding_status: 'PROSPECT',
            health_score: 100,
            created_by: req.user?.user_id || null
        };

        // Insert corporate
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

        // Insert contacts if provided
        if (contacts && Array.isArray(contacts) && contacts.length > 0) {
            const contactsData = contacts
                .filter(c => c.full_name && c.email)
                .map((c, index) => ({
                    tenant_id: corporate.tenant_id,
                    full_name: sanitizeString(c.full_name),
                    email: sanitizeString(c.email),
                    phone: sanitizeString(c.phone),
                    mobile: sanitizeString(c.mobile),
                    designation: sanitizeString(c.designation),
                    department: sanitizeString(c.department),
                    job_level: sanitizeString(c.job_level),
                    contact_role: c.contact_role || 'GENERAL',
                    is_primary: index === 0,
                    is_decision_maker: c.is_decision_maker || false,
                    can_approve_claims: c.can_approve_claims || false,
                    can_manage_employees: c.can_manage_employees || false,
                    can_view_reports: c.can_view_reports || false,
                    can_manage_billing: c.can_manage_billing || false,
                    preferred_channel: c.preferred_channel || 'EMAIL',
                    status: 'ACTIVE'
                }));

            if (contactsData.length > 0) {
                await supabase.from('corporate_contacts').insert(contactsData);
            }
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
// UPDATE CORPORATE
// =====================================================
router.put('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Get current data for activity log
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

        // Fields that can be updated
        const allowedFields = [
            'corporate_legal_name', 'corporate_group_name', 'corporate_type', 'industry_type',
            'parent_tenant_id', 'broker_id', 'account_manager_id',
            'address', 'registration_details', 'branding_config',
            'contract_start_date', 'contract_end_date', 'contract_value', 'billing_cycle', 'payment_terms',
            'portal_url', 'portal_status', 'portal_settings',
            'onboarding_status', 'onboarding_checklist',
            'renewal_reminder_days', 'renewal_status',
            'communication_preferences',
            'is_favorite', 'tags', 'internal_notes', 'custom_fields',
            'status'
        ];

        // Build update object
        const updates = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates[field] = updateData[field];
            }
        }
        updates.updated_by = req.user?.user_id || null;

        // Update corporate
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
// UPDATE CORPORATE STATUS
// =====================================================
router.patch('/corporates/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const { data: corporate, error } = await supabase
            .from('tenants')
            .update({ 
                status,
                updated_by: req.user?.user_id 
            })
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update status',
                error: error.message
            });
        }

        // Log activity
        await logActivity(
            id,
            'STATUS_CHANGED',
            `Status changed to ${status}${reason ? ': ' + reason : ''}`,
            {
                new_values: { status, reason },
                performed_by: req.user?.user_id,
                performed_by_type: 'ADMIN'
            }
        );

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: corporate
        });

    } catch (error) {
        console.error('Error in PATCH /corporates/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// UPDATE ONBOARDING STATUS
// =====================================================
router.patch('/corporates/:id/onboarding-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { onboarding_status, notes } = req.body;

        const validStatuses = ['LEAD', 'PROSPECT', 'PROPOSAL_SENT', 'NEGOTIATION', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'];
        if (!validStatuses.includes(onboarding_status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid onboarding status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const updates = {
            onboarding_status,
            updated_by: req.user?.user_id
        };

        // Set timestamps based on status
        if (onboarding_status === 'ONBOARDING') {
            updates.onboarding_started_at = new Date().toISOString();
        } else if (onboarding_status === 'ACTIVE') {
            updates.onboarding_completed_at = new Date().toISOString();
            updates.status = 'ACTIVE';
        }

        const { data: corporate, error } = await supabase
            .from('tenants')
            .update(updates)
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update onboarding status',
                error: error.message
            });
        }

        // Log activity
        await logActivity(
            id,
            'ONBOARDING_STATUS_CHANGED',
            `Onboarding status changed to ${onboarding_status}${notes ? ': ' + notes : ''}`,
            {
                new_values: { onboarding_status, notes },
                performed_by: req.user?.user_id,
                performed_by_type: 'ADMIN'
            }
        );

        res.json({
            success: true,
            message: 'Onboarding status updated successfully',
            data: corporate
        });

    } catch (error) {
        console.error('Error in PATCH /corporates/:id/onboarding-status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// TOGGLE FAVORITE
// =====================================================
router.patch('/corporates/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_favorite } = req.body;

        const { data: corporate, error } = await supabase
            .from('tenants')
            .update({ is_favorite: !!is_favorite })
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update favorite',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: is_favorite ? 'Added to favorites' : 'Removed from favorites',
            data: corporate
        });

    } catch (error) {
        console.error('Error in PATCH /corporates/:id/favorite:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// UPDATE TAGS
// =====================================================
router.patch('/corporates/:id/tags', async (req, res) => {
    try {
        const { id } = req.params;
        const { tags, action = 'set' } = req.body; // action: set, add, remove

        let newTags;

        if (action === 'set') {
            newTags = tags || [];
        } else {
            // Get current tags
            const { data: current } = await supabase
                .from('tenants')
                .select('tags')
                .eq('tenant_id', id)
                .single();

            const currentTags = current?.tags || [];

            if (action === 'add') {
                newTags = [...new Set([...currentTags, ...tags])];
            } else if (action === 'remove') {
                newTags = currentTags.filter(t => !tags.includes(t));
            }
        }

        const { data: corporate, error } = await supabase
            .from('tenants')
            .update({ tags: newTags })
            .eq('tenant_id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update tags',
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Tags updated successfully',
            data: corporate
        });

    } catch (error) {
        console.error('Error in PATCH /corporates/:id/tags:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// =====================================================
// DELETE CORPORATE (Soft delete)
// =====================================================
router.delete('/corporates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hard_delete = false } = req.query;

        if (hard_delete === 'true') {
            // Hard delete (be careful!)
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
            // Soft delete
            const { data: corporate, error } = await supabase
                .from('tenants')
                .update({ 
                    status: 'INACTIVE',
                    updated_by: req.user?.user_id
                })
                .eq('tenant_id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete corporate',
                    error: error.message
                });
            }

            // Log activity
            await logActivity(
                id,
                'DELETED',
                'Corporate deactivated (soft delete)',
                {
                    performed_by: req.user?.user_id,
                    performed_by_type: 'ADMIN'
                }
            );
        }

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
// BULK OPERATIONS
// =====================================================
router.post('/corporates/bulk', async (req, res) => {
    try {
        const { action, ids, data } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No corporate IDs provided'
            });
        }

        let result;

        switch (action) {
            case 'update_status':
                result = await supabase
                    .from('tenants')
                    .update({ status: data.status })
                    .in('tenant_id', ids);
                break;

            case 'assign_account_manager':
                result = await supabase
                    .from('tenants')
                    .update({ account_manager_id: data.account_manager_id })
                    .in('tenant_id', ids);
                break;

            case 'assign_broker':
                result = await supabase
                    .from('tenants')
                    .update({ broker_id: data.broker_id })
                    .in('tenant_id', ids);
                break;

            case 'add_tags':
                // This requires fetching current tags first
                for (const id of ids) {
                    const { data: current } = await supabase
                        .from('tenants')
                        .select('tags')
                        .eq('tenant_id', id)
                        .single();
                    const newTags = [...new Set([...(current?.tags || []), ...data.tags])];
                    await supabase.from('tenants').update({ tags: newTags }).eq('tenant_id', id);
                }
                result = { error: null };
                break;

            case 'delete':
                result = await supabase
                    .from('tenants')
                    .update({ status: 'INACTIVE' })
                    .in('tenant_id', ids);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid bulk action'
                });
        }

        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Bulk operation failed',
                error: result.error.message
            });
        }

        res.json({
            success: true,
            message: `Bulk ${action} completed for ${ids.length} corporates`
        });

    } catch (error) {
        console.error('Error in POST /corporates/bulk:', error);
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

// Get contacts for a corporate
router.get('/corporates/:id/contacts', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: contacts, error } = await supabase
            .from('corporate_contacts')
            .select('*')
            .eq('tenant_id', id)
            .eq('status', 'ACTIVE')
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

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

// Add contact
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

        // If this is primary, remove primary from others
        if (contactData.is_primary) {
            await supabase
                .from('corporate_contacts')
                .update({ is_primary: false })
                .eq('tenant_id', id)
                .neq('contact_id', contact.contact_id);
        }

        // Log activity
        await logActivity(
            id,
            'CONTACT_ADDED',
            `Contact "${contact.full_name}" added`,
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

// Update contact
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

// Delete contact
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

// Get notes for a corporate
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

// Add note
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

        // Log activity
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
module.exports = router;
