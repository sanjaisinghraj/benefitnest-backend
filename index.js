/* =========================
   LOAD ENV FIRST (CRITICAL)
========================= */
require("dotenv").config();

/* =========================
   INIT DB (AFTER ENV)
========================= */
const pool = require("./db");

/* =========================
   INIT APP
========================= */
const express = require("express");
const cors = require("cors");

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.use(express.json());

/* =========================
   CORS (MUST BE BEFORE ROUTES)
========================= */
const corsOptions = {
  origin: [
    "https://admin.benefitnest.space",
    "https://www.benefitnest.space",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ PRE-FLIGHT FIX

/* =========================
   REQUEST LOGGING (TEMP)
========================= */
app.use((req, res, next) => {
  console.log("METHOD:", req.method);
  console.log("HOST:", req.headers.host);
  console.log("PATH:", req.path);
  next();
});

/* =========================
   ROUTES & MIDDLEWARE
========================= */
const employeeRoutes = require("./employee");
const adminRoutes = require("./admin");
const authMiddleware = require("./auth");
const tenantMiddleware = require("./tenant");
const brandingMiddleware = require("./branding");

/* =========================
   HEALTH CHECK (PUBLIC)
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   AUTH ROUTES (PUBLIC)
========================= */
app.use("/api/auth", adminRoutes);

/* =========================
   ADMIN ROUTES
========================= */
app.use("/api/admin", adminRoutes);

/* =========================
   TENANT-AWARE ROUTES
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
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
