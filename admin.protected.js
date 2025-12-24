const express = require("express");
const pool = require("./db");

const router = express.Router();

/* =========================
   ADMIN SUBDOMAIN GUARD
========================= */
router.use((req, res, next) => {
  const host = req.headers.host?.split(":")[0];
  if (!host || !host.startsWith("admin.")) {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
});

/* =========================
   EXAMPLE PROTECTED ROUTE
========================= */
router.get("/dashboard", (req, res) => {
  res.json({ message: "Welcome Admin" });
});

module.exports = router;
