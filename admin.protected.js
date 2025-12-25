const express = require("express");
const pool = require("./db");

const router = express.Router();

/* =========================
   ADMIN SUBDOMAIN GUARD
   (TEMP TEST BYPASS ENABLED)
========================= */
router.use((req, res, next) => {
  // ✅ TEMP: allow testing without admin subdomain
  if (process.env.ALLOW_ADMIN_TEST === "true") {
    return next();
  }

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
