const express = require("express");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("./auth");
const corporateOnly = require("./middlewares/corporateOnly");

const {
  hashPassword,
  validatePassword,
  encrypt,
  decrypt
} = require("./security");

const router = express.Router();

/* =========================
   EMPLOYEE SIGNUP
========================= */
router.post("/signup", corporateOnly, async (req, res) => {
  const { loginId, password, consent } = req.body;

  // In prod, tenant exists; in dev, bypass sets no tenant
  const corporateId = req.tenant ? req.tenant.tenant_id : null;


  if (!loginId || !password || consent !== true) {
    return res
      .status(400)
      .json({ error: "Missing fields or consent not accepted" });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Weak password" });
  }

  try {
    const loginEnc = encrypt(loginId);

    const existing = await pool.query(
      `SELECT 1 FROM employees
       WHERE corporate_id = $1 AND login_id_enc = $2`,
      [corporateId, loginEnc]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Employee already exists" });
    }

    const passwordHash = await hashPassword(password);

    await pool.query(
      `INSERT INTO employees
       (corporate_id, login_id_enc, password_hash, consent_accepted, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [corporateId, loginEnc, passwordHash, true]
    );

    res.json({ message: "Employee created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

/* =========================
   EMPLOYEE LOGIN
========================= */
router.post("/login", corporateOnly, async (req, res) => {
  const { loginId, password, consent } = req.body;
  const corporateId = req.tenant ? req.tenant.tenant_id : null;


  if (!loginId || !password || consent !== true) {
    return res
      .status(400)
      .json({ error: "Missing fields or consent not accepted" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM employees
       WHERE corporate_id = $1 AND is_active = true`,
      [corporateId]
    );

    const employee = result.rows.find(
      e => decrypt(e.login_id_enc) === loginId
    );

    if (!employee) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(
      password,
      employee.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        employeeId: employee.id,
        corporateId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      profileCompleted: employee.profile_completed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   FORGOT PASSWORD (OTP)
========================= */
router.post("/forgot-password", corporateOnly, async (req, res) => {
  const { loginId } = req.body;
  const corporateId = req.tenant ? req.tenant.id : null;


  if (!loginId) {
    return res.status(400).json({ error: "Login ID required" });
  }

  const result = await pool.query(
    `SELECT * FROM employees
     WHERE corporate_id = $1 AND is_active = true`,
    [corporateId]
  );

  const employee = result.rows.find(
    e => decrypt(e.login_id_enc) === loginId
  );

  if (!employee) {
    return res.json({ message: "If account exists, OTP sent" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `UPDATE employees
     SET reset_otp = $1, reset_otp_expires = $2
     WHERE id = $3`,
    [encrypt(otp), expires, employee.id]
  );

  console.log("RESET OTP (dev only):", otp);
  res.json({ message: "OTP sent" });
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password", corporateOnly, async (req, res) => {
  const { loginId, otp, newPassword } = req.body;
  const corporateId = req.tenant ? req.tenant.id : null;


  if (!loginId || !otp || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ error: "Weak password" });
  }

  const result = await pool.query(
    `SELECT * FROM employees
     WHERE corporate_id = $1 AND is_active = true`,
    [corporateId]
  );

  const employee = result.rows.find(
    e => decrypt(e.login_id_enc) === loginId
  );

  if (
    !employee ||
    !employee.reset_otp ||
    decrypt(employee.reset_otp) !== otp ||
    new Date(employee.reset_otp_expires) < new Date()
  ) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const hash = await hashPassword(newPassword);

  await pool.query(
    `UPDATE employees
     SET password_hash = $1,
         reset_otp = NULL,
         reset_otp_expires = NULL
     WHERE id = $2`,
    [hash, employee.id]
  );

  res.json({ message: "Password reset successful" });
});

/* =========================
   EMPLOYEE DASHBOARD
========================= */
router.get("/dashboard", auth, (req, res) => {
  res.json({
    message: "Welcome to your dashboard",
    employeeId: req.user.employeeId,
    corporateId: req.user.corporateId
  });
});

/* =========================
   TENANT BRANDING
========================= */
router.get("/branding", (req, res) => {
  res.json(req.branding || {});
});

/* =========================
   LOGOUT
========================= */
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
