const express = require('express');
const router = express.Router();

// Import Supabase client directly
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   GET ALL CORPORATES/TENANTS
========================= */
router.get('/corporates', async (req, res) => {
  try {
    console.log('Fetching all corporates...');
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching corporates:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch corporates',
        error: error.message 
      });
    }

    console.log(`Found ${data ? data.length : 0} corporates`);
    
    res.json({
      success: true,
      data: data || [],
      count: data ? data.length : 0
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

/* =========================
   GET SINGLE CORPORATE
========================= */
router.get('/corporates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching corporate:', id);
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('tenant_id', id)
      .single();

    if (error) {
      console.error('Error fetching corporate:', error);
      return res.status(404).json({ 
        success: false, 
        message: 'Corporate not found' 
      });
    }

    res.json({
      success: true,
      data: data
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

/* =========================
   CREATE CORPORATE
========================= */
router.post('/corporates', async (req, res) => {
  try {
    console.log('Creating corporate:', req.body);
    
    const {
      tenant_code,
      subdomain,
      corporate_legal_name,
      corporate_group_name,
      corporate_type,
      industry_type,
      address,
      contact_details,
      benefitnest_manager
    } = req.body;

    // Validation
    if (!tenant_code || !subdomain || !corporate_legal_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tenant_code, subdomain, corporate_legal_name'
      });
    }

    // Generate schema name from subdomain
    const schema_name = `tenant_${subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const { data, error } = await supabase
      .from('tenants')
      .insert([{
        tenant_code,
        subdomain,
        schema_name,
        corporate_legal_name,
        corporate_group_name,
        corporate_type,
        industry_type,
        address,
        contact_details,
        benefitnest_manager,
        status: 'ACTIVE'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating corporate:', error);
      
      // Check for duplicate subdomain
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Subdomain already exists'
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create corporate',
        error: error.message 
      });
    }

    console.log('Corporate created:', data.tenant_id);
    
    res.status(201).json({
      success: true,
      message: 'Corporate created successfully',
      data: data
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

/* =========================
   UPDATE CORPORATE
========================= */
router.put('/corporates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating corporate:', id);
    
    const {
      corporate_legal_name,
      corporate_group_name,
      corporate_type,
      industry_type,
      address,
      contact_details,
      benefitnest_manager,
      branding_config,
      status
    } = req.body;

    const { data, error } = await supabase
      .from('tenants')
      .update({
        corporate_legal_name,
        corporate_group_name,
        corporate_type,
        industry_type,
        address,
        contact_details,
        benefitnest_manager,
        branding_config,
        status
      })
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

    console.log('Corporate updated:', id);
    
    res.json({
      success: true,
      message: 'Corporate updated successfully',
      data: data
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

/* =========================
   DELETE CORPORATE (Soft delete)
========================= */
router.delete('/corporates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting corporate:', id);
    
    // Soft delete by setting status to INACTIVE
    const { data, error } = await supabase
      .from('tenants')
      .update({ status: 'INACTIVE' })
      .eq('tenant_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting corporate:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete corporate',
        error: error.message 
      });
    }

    console.log('Corporate deleted (soft):', id);
    
    res.json({
      success: true,
      message: 'Corporate deleted successfully',
      data: data
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

/* =========================
   GET CORPORATE STATS
========================= */
router.get('/corporates/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get employee count
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);
    
    // Get policy count
    const { count: policyCount } = await supabase
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);
    
    // Get active enrollment count
    const { count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('status', 'ACTIVE');
    
    // Get claim count
    const { count: claimCount } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    res.json({
      success: true,
      data: {
        tenant_id: id,
        employees: employeeCount || 0,
        policies: policyCount || 0,
        enrollments: enrollmentCount || 0,
        claims: claimCount || 0
      }
    });

  } catch (error) {
    console.error('Error in GET /corporates/:id/stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
