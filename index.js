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
   CORS CONFIGURATION (CRITICAL - MUST BE FIRST)
========================= */
// Allow all origins for admin.benefitnest.space
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://admin.benefitnest.space',
      'https://www.benefitnest.space',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight for all routes
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   INIT DB
========================= */
require("./db");

/* =========================
   ROUTES
========================= */
const portalRoutes = require('./routes/portal.routes');
app.use('/api', portalRoutes);
const adminSchemaRoutes = require('./routes/admin.schema.routes');
app.use('/api/admin/schema', adminSchemaRoutes);

const lookupRoutes = require('./routes/lookup.public');
app.use('/api/lookup', lookupRoutes);

const adminPublicRoutes = require("./admin.public");
const adminProtectedRoutes = require("./admin.protected");
const employeeRoutes = require("./employee");
const corporatesRoutes = require("./corporates.routes");
const mastersRoutes = require('./routes/masters.routes');

const authMiddleware = require("./auth");
const tenantMiddleware = require("./tenant");
const brandingMiddleware = require("./branding");

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({ 
    status: "ok",
    message: "BenefitNest Backend API",
    timestamp: new Date().toISOString()
  });
});

/* =========================
   TEST ENDPOINT (NO AUTH)
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
   ADMIN PUBLIC ROUTES (NO AUTH)
========================= */



app.use("/api/admin", adminPublicRoutes);

/* =========================
   ADMIN PROTECTED ROUTES (WITH AUTH)
========================= */
app.use("/api/admin", authMiddleware, adminProtectedRoutes);

/* =========================
   CORPORATES MANAGEMENT (WITH AUTH)
========================= */
app.use("/api/admin", authMiddleware, corporatesRoutes);

/* =========================
   MASTERS MANAGEMENT (WITH AUTH)
========================= */
app.use("/api/admin", authMiddleware, mastersRoutes);

/* =========================
   TENANT / EMPLOYEE ROUTES
========================= */
app.use(tenantMiddleware);
app.use(brandingMiddleware);
app.use("/api/employee", authMiddleware, employeeRoutes);

/* =========================
   ERROR HANDLING
========================= */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Route not found",
    path: req.path
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS enabled for admin.benefitnest.space`);
  console.log('=================================');
});
