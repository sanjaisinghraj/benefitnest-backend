/* =========================
   LOAD ENV FIRST (CRITICAL)
========================= */
require("dotenv").config();

/* =========================
   INIT DB (AFTER ENV)
========================= */
const pool = require("./db");

const express = require("express");

const cors = require("cors");


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
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   AUTH ROUTES (PUBLIC)
========================= */
app.use("/api/auth", adminRoutes);

/* =========================
   ADMIN ROUTES (PROTECTED)
========================= */
app.use("/api/admin", authMiddleware, adminRoutes);

app.use(
  cors({
    origin: [
      "https://admin.benefitnest.space",
      "https://www.benefitnest.space"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

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
