const express = require('express');
const router = express.Router();
const db = require('../db');

// SAVE tenant UI config
router.post('/save', async (req, res) => {
  const { tenantId, config } = req.body;

  if (!tenantId || !config) {
    return res.status(400).json({ error: 'tenantId and config required' });
  }

  try {
    await db.query(
      `
      INSERT INTO tenant_ui_config (tenant_id, config)
      VALUES ($1, $2)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = now()
      `,
      [tenantId, config]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

module.exports = router;
