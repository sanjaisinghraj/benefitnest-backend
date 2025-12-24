const express = require("express");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

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
   ADMIN LOGIN
========================= */
router.post("/login", async (req, res) => {
  const { email, password, rememberMe, captchaToken } = req.body;

  if (!email || !password || !captchaToken) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    /* CAPTCHA VERIFY */
    const captchaRes = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        },
      }
    );

    if (!captchaRes.data.success) {
      return res.status(401).json({ error: "Captcha validation failed" });
    }

    /* ADMIN LOOKUP */
    const result = await pool.query(
      `SELECT id, email, password_hash, role, is_active
       FROM admins
       WHERE email=$1`,
      [email]
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* JWT */
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: rememberMe ? "30d" : "1d",
      }
    );

    /* AUDIT LOG */
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action)
       VALUES ($1, 'LOGIN')`,
      [admin.id]
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Admin login failed" });
  }
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
