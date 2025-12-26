const db = require('../db'); // your existing pg / sequelize connection

exports.getCorporatesSchema = async (req, res) => {
  try {
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'corporates'
      ORDER BY ordinal_position;
    `;

    const constraintsQuery = `
      SELECT
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'corporates';
    `;

    const columns = await db.query(columnsQuery);
    const constraints = await db.query(constraintsQuery);

    res.json({
      success: true,
      table: 'corporates',
      columns: columns.rows,
      constraints: constraints.rows
    });
  } catch (err) {
    console.error('Schema fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to load schema' });
  }
};
