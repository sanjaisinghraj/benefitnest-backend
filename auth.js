const jwt = require("jsonwebtoken");

/**
 * Universal Auth Middleware
 * Supports: ADMIN, CORPORATE, EMPLOYEE
 */
module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    /* Token must be present */
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];

    /* Verify token */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* Mandatory base claims */
    if (!decoded.role) {
      return res.status(401).json({ error: "Invalid token: role missing" });
    }

    /* Role-specific validation */
    if (decoded.role === "EMPLOYEE") {
      if (!decoded.employeeId || !decoded.corporateId) {
        return res.status(401).json({ error: "Invalid employee token" });
      }
    }

    if (decoded.role === "CORPORATE") {
      if (!decoded.corporateId) {
        return res.status(401).json({ error: "Invalid corporate token" });
      }
    }

    if (decoded.role === "ADMIN") {
      if (!decoded.email) {
        return res.status(401).json({ error: "Invalid admin token" });
      }
    }

    /* Attach user context (normalized) */
    req.user = {
      role: decoded.role,
      employeeId: decoded.employeeId || null,
      corporateId: decoded.corporateId || null,
      email: decoded.email || null,
      tenant: decoded.tenant || null
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
