module.exports = function branding(req, res, next) {
  if (!req.tenant || !req.tenant.branding_config) {
    req.branding = {
      primaryColor: "#2563eb",
      secondaryColor: "#0f172a",
      logoUrl: null
    };
    return next();
  }

  const branding = req.tenant.branding_config;

  req.branding = {
    primaryColor: branding.primaryColor || "#2563eb",
    secondaryColor: branding.secondaryColor || "#0f172a",
    logoUrl: branding.logoUrl || null
  };

  next();
};
