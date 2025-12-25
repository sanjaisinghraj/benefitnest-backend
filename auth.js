const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  // ✅ ALLOW CORS PREFLIGHT
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
