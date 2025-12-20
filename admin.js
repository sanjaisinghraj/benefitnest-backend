const express = require("express");
const pool = require("./db");

const router = express.Router();

/* =========================
   ADMIN SUBDOMAIN GUARD
========================= */
router.use((req, res, next) => {
  const host = req.headers.host;
  if (!host) {
    return res.status(403).json({ error: "Invalid admin access" });
  }

  const subdomain = host.split(":")[0].split(".")[0];

  if (subdomain !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }

  req.isAdmin = true;
  next();
});

/* =========================
   CREATE CORPORATE
========================= */
router.post("/corporate", async (req, res) => {
  const {
    name,
    subdomain,
    allowed_login_methods,
    branding_config
  } = req.body;

  if (!name || !subdomain) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await pool.query(
      `INSERT INTO corporates
       (name, subdomain, allowed_login_methods, branding_config, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [
        name,
        subdomain.toLowerCase(),
        allowed_login_methods || ["email"],
        branding_config || {}
      ]
    );

    res.json({ message: "Corporate created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Corporate creation failed" });
  }
});

/* =========================
   LIST CORPORATES
========================= */
router.get("/corporate", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, subdomain, is_active, created_at
       FROM corporates
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch corporates" });
  }
});

module.exports = router;
