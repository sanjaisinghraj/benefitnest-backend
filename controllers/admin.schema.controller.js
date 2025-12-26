const { supabase } = require('../db');

const getCorporatesSchema = async (req, res) => {
  try {
    // Get columns
    const { data: columns, error: colErr } = await supabase.rpc('get_table_schema', {
      p_schema: 'public',
      p_table: 'tenants'
    });

    if (colErr) throw colErr;

    // Get constraints
    const { data: constraints, error: conErr } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_type, constraint_name')
      .eq('table_name', 'tenants')
      .eq('table_schema', 'public');

    res.json({
      success: true,
      columns: columns || [],
      constraints: constraints || []
    });
  } catch (err) {
    console.error('Schema error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCorporatesSchema };