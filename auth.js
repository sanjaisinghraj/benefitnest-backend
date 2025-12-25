const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  // ✅ allow CORS preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  /* DEV MODE */
  if (process.env.NODE_ENV !== "production") {
    req.user = {
      user_id: "DEV_USER",
      role: "ADMIN"
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
