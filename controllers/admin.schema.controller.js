const supabase = require('../db');

const getCorporatesSchema = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_table_schema', {
      p_schema: 'public',
      p_table: 'tenants'
    });

    if (error) throw error;

    res.json({
      success: true,
      columns: data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

module.exports = { getCorporatesSchema };
