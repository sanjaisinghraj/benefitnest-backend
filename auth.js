const jwt = require("jsonwebtoken");

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

    /* Mandatory claims check */
    if (!decoded.employeeId || !decoded.corporateId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    /* Attach user context */
    req.user = {
      employeeId: decoded.employeeId,
      corporateId: decoded.corporateId,
      tenant: decoded.tenant || null
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
