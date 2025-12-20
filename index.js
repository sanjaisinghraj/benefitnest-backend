require("dotenv").config();

const express = require("express");
const pool = require("./db");

/* Routes & Middleware */
const employeeRoutes = require("./employee");
const adminRoutes = require("./admin");
const authMiddleware = require("./auth");
const tenantMiddleware = require("./tenant");
const brandingMiddleware = require("./branding");

const app = express();
app.use(express.json());

/* =========================
   REQUEST LOGGING (TEMP)
========================= */
app.use((req, res, next) => {
  console.log("HOST:", req.headers.host);
  console.log("PATH:", req.path);
  next();
});

/* =========================
   HEALTH CHECK (PUBLIC)
========================= */
app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("Backend + Database connected");
  } catch (err) {
    res.status(500).send("Database connection failed");
  }
});

/* =========================
   AUTH ROUTES (PUBLIC)
========================= */
app.use("/api/auth", adminRoutes);

/* =========================
   ADMIN ROUTES (PROTECTED)
========================= */
app.use("/api/admin", authMiddleware, adminRoutes);

/* =========================
   TENANT-AWARE ROUTES
   (CORPORATE / EMPLOYEE)
========================= */
app.use(tenantMiddleware);      // resolves tenant from subdomain
app.use(brandingMiddleware);    // injects tenant branding
app.use("/api/employee", authMiddleware, employeeRoutes);

/* =========================
   FALLBACK
========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
