/* =========================
   LOAD ENV FIRST
========================= */
require("dotenv").config();

/* =========================
   IMPORTS
========================= */
const express = require("express");
const cors = require("cors");

/* =========================
   INIT APP
========================= */
const app = express();

/* =========================
   CORS (FIRST)
========================= */
app.use(
  cors({
    origin: [
      "https://admin.benefitnest.space",
      "https://www.benefitnest.space",
    ],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());

/* =========================
   INIT DB
========================= */
require("./db");

/* =========================
   ROUTES
========================= */
const adminPublicRoutes = require("./admin.public");
const adminProtectedRoutes = require("./admin.protected");
const employeeRoutes = require("./employee");

const authMiddleware = require("./auth");
const tenantMiddleware = require("./tenant");
const brandingMiddleware = require("./branding");

/* =========================
   LOGGING
========================= */
app.use((req, res, next) => {
  console.log("METHOD:", req.method);
  console.log("PATH:", req.path);
  next();
});

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   ADMIN LOGIN (PUBLIC)
========================= */
app.use("/api/admin", adminPublicRoutes);

/* =========================
   ADMIN PROTECTED
========================= */
app.use("/api/admin", authMiddleware, adminProtectedRoutes);

/* =========================
   TENANT / EMPLOYEE
========================= */
app.use(tenantMiddleware);
app.use(brandingMiddleware);
app.use("/api/employee", authMiddleware, employeeRoutes);

/* =========================
   FALLBACK
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
