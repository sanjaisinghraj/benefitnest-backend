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
// ✅ GLOBAL CORS + PREFLIGHT (DO NOT MOVE)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://admin.benefitnest.space");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


/* =========================
   CORS (MUST BE FIRST)
========================= */
app.use(
  cors({
    origin: [
      "https://admin.benefitnest.space",
      "https://benefitnest.space",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
const corporatesRoutes = require("./corporates.routes");
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
   ADMIN PROTECTED ROUTES
========================= */
app.use("/api/admin", authMiddleware, adminProtectedRoutes);
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
