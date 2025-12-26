const supabase = require('../db');

/**
 * GET /api/admin/schema/corporates
 * Returns DB schema for tenants table (used as corporates master)
 */
const getCorporatesSchema = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select(`
        column_name,
        data_type,
        is_nullable,
        column_default
      `)
      .eq('table_schema', 'public')
      .eq('table_name', 'tenants')
      .order('ordinal_position');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      columns: data
    });
  } catch (err) {
    console.error('Schema API error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch schema'
    });
  }
};

module.exports = { getCorporatesSchema };
