const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.use((req, res, next) => {
  // ✅ allow CORS preflight
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

    if (!decoded?.role || !decoded.role.toLowerCase().includes("admin")) {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
