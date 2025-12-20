const pool = require("./db");

module.exports = async function tenantMiddleware(req, res, next) {
  try {
    /* Example hosts:
       admin.localhost:3000
       democorp.localhost:3000
       benefitnest.space
       admin.benefitnest.space
    */
    const hostHeader = req.headers.host;
    if (!hostHeader) return next();

    /* Remove port if present */
    const hostname = hostHeader.split(":")[0];

    /* Extract subdomain safely */
    const parts = hostname.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    /* =========================
       ADMIN TENANT
    ========================= */
    if (subdomain === "admin") {
      req.isAdmin = true;
      return next();
    }

    /* =========================
       CORPORATE TENANT
    ========================= */
    if (!subdomain) {
      return res
        .status(400)
        .json({ error: "Corporate subdomain missing" });
    }

    const result = await pool.query(
      `SELECT
         id,
         name,
         subdomain,
         allowed_login_methods,
         branding_config
       FROM corporates
       WHERE subdomain = $1 AND is_active = true`,
      [subdomain.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Invalid or inactive tenant" });
    }

    /* Attach tenant context */
    req.tenant = result.rows[0];
    req.isAdmin = false;

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
};
