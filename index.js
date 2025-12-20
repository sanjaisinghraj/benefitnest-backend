require("dotenv").config();

const express = require("express");
const pool = require("./db");

const employeeRoutes = require("./employee");
const adminRoutes = require("./admin");
const tenantMiddleware = require("./tenant");
const branding = require("./branding");

const app = express();
app.use(express.json());

/* 🔍 Log incoming host (keep for now) */
app.use((req, res, next) => {
  console.log("HOST:", req.headers.host);
  next();
});

/* =========================
   HEALTH CHECK (NO TENANT)
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
   ADMIN (NO TENANT)
========================= */
app.use("/admin", adminRoutes);

/* =========================
   TENANT-AWARE ROUTES ONLY
========================= */
app.use(tenantMiddleware);
app.use(branding);
app.use("/employee", employeeRoutes);

/* =========================
   START SERVER
========================= */
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
