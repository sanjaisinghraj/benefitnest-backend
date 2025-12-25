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
      "http://localhost:3000", // For local development
      "http://localhost:5173", // For Vite
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
const corporatesRoutes = require("./corporates.routes"); // NEW

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
   TEST ENDPOINT (NO AUTH) - Place before auth middleware
========================= */
app.get("/api/admin/corporates/test", async (req, res) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .limit(5);

    res.json({
      success: true,
      message: 'Backend is working! No auth required.',
      data: data,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/* =========================
   ADMIN PROTECTED ROUTES
========================= */
app.use("/api/admin", authMiddleware, adminProtectedRoutes);

/* =========================
   CORPORATES MANAGEMENT (NEW)
========================= */
app.use("/api/admin", authMiddleware, corporatesRoutes);

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
