const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  /* ======================================
     DEV MODE BYPASS (LOCAL ONLY)
  ====================================== */
  if (process.env.NODE_ENV !== "production") {
    req.user = {
      user_id: "DEV_USER",
      role: "ADMIN"
    };
    return next();
  }

  /* ======================================
     PRODUCTION AUTH LOGIC
  ====================================== */
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      user_id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Invalid or expired token" });
  }
};
