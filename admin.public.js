const express = require("express");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const router = express.Router();

/* =========================
   ADMIN LOGIN (PUBLIC)
========================= */
router.post("/login", async (req, res) => {
  const { email, password, rememberMe, captchaToken } = req.body;

  if (!email || !password || !captchaToken) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // CAPTCHA
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
      return res.status(401).json({ error: "Captcha failed" });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash, role, is_active
       FROM admins WHERE email=$1`,
      [email]
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? "30d" : "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
