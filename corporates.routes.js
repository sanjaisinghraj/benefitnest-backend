const express = require("express");
const pool = require("./db");

const router = express.Router();

/* LIST */
router.get("/corporates", async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM tenants ORDER BY created_at DESC`
  );

  res.json({
    success: true,
    data: result.rows,
    count: result.rowCount
  });
});

/* CREATE */
router.post("/corporates", async (req, res) => {
  const {
    tenant_code,
    subdomain,
    corporate_legal_name,
    corporate_group_name,
    corporate_type,
    industry_type,
    contact_details
  } = req.body;

  const result = await pool.query(
    `
    INSERT INTO tenants (
      tenant_code,
      subdomain,
      corporate_legal_name,
      corporate_group_name,
      corporate_type,
      industry_type,
      contact_details,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE')
    RETURNING *
    `,
    [
      tenant_code,
      subdomain,
      corporate_legal_name,
      corporate_group_name,
      corporate_type,
      industry_type,
      contact_details
    ]
  );

  res.json({
    success: true,
    message: "Corporate created successfully",
    data: result.rows[0]
  });
});

/* UPDATE */
router.put("/corporates/:id", async (req, res) => {
  const { id } = req.params;

  const {
    corporate_legal_name,
    corporate_group_name,
    corporate_type,
    industry_type,
    contact_details
  } = req.body;

  const result = await pool.query(
    `
    UPDATE tenants
    SET
      corporate_legal_name = COALESCE($1, corporate_legal_name),
      corporate_group_name = COALESCE($2, corporate_group_name),
      corporate_type = COALESCE($3, corporate_type),
      industry_type = COALESCE($4, industry_type),
      contact_details = COALESCE($5, contact_details)
    WHERE tenant_id = $6
    RETURNING *
    `,
    [
      corporate_legal_name,
      corporate_group_name,
      corporate_type,
      industry_type,
      contact_details,
      id
    ]
  );

  res.json({
    success: true,
    message: "Corporate updated successfully",
    data: result.rows[0]
  });
});

/* DELETE */
router.delete("/corporates/:id", async (req, res) => {
  await pool.query(`DELETE FROM tenants WHERE tenant_id = $1`, [req.params.id]);

  res.json({
    success: true,
    message: "Corporate deleted successfully"
  });
});

module.exports = router;
