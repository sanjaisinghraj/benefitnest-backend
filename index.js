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
   CORS (MUST BE FIRST)
========================= */
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

app.options("*", cors());
app.use(express.json());

/* =========================
   INIT DB
========================= */
const pool = require("./db");

/* =========================
   ROUTES
========================= */
const adminRoutes = require("./admin");
const employeeRoutes = require("./employee");
const authMiddleware = require("./auth");
const tenantMiddleware = require("./tenant");
const brandingMiddleware = require("./branding");

/* =========================
   LOGGING (TEMP)
========================= */
app.use((req, res, next) => {
  console.log("HOST:", req.headers.host);
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
   ADMIN AUTH (PUBLIC)
========================= */
app.post("/api/admin/login", adminRoutes);

/* =========================
   ADMIN PROTECTED
========================= */
app.use("/api/admin", authMiddleware, adminRoutes);

/* =========================
   TENANT ROUTES
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
