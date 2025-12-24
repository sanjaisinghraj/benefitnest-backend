const pool = require("./db");

module.exports = async function tenantMiddleware(req, res, next) {
  try {
    /* ======================================
       DEV MODE BYPASS (LOCAL ONLY)
       DO NOT REMOVE
    ====================================== */
    if (process.env.NODE_ENV !== "production") {
      req.isAdmin = true;
      req.tenant = null;
      return next();
    }

    /* ======================================
       PRODUCTION TENANT LOGIC
    ====================================== */

    const hostHeader = req.headers.host;
    if (!hostHeader) {
      return res.status(400).json({ error: "Host header missing" });
    }

    const hostname = hostHeader.split(":")[0];
    const parts = hostname.split(".");
    const subdomain = parts.length > 2 ? parts[0].toLowerCase() : null;

    /* ADMIN TENANT */
    if (subdomain === "admin") {
      req.isAdmin = true;
      return next();
    }

    /* CORPORATE REQUIRED */
    if (!subdomain) {
      return res
        .status(400)
        .json({ error: "Corporate subdomain missing" });
    }

    /* FETCH TENANT */
    const result = await pool.query(
      `
      SELECT
        tenant_id,
        corporate_legal_name,
        subdomain,
        branding_config,
        status
      FROM tenants
      WHERE subdomain = $1 AND status = 'ACTIVE'
      `,
      [subdomain]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Invalid or inactive tenant" });
    }

    req.tenant = result.rows[0];
    req.isAdmin = false;

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err.message);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
};
