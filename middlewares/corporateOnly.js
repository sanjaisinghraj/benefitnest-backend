module.exports = function corporateOnly(req, res, next) {
  /* ======================================
     DEV MODE BYPASS (LOCAL ONLY)
  ====================================== */
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  /* ======================================
     PRODUCTION LOGIC
  ====================================== */
  if (!req.tenant) {
    return res
      .status(403)
      .json({ error: "Corporate access only" });
  }

  next();
};
