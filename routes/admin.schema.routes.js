const express = require('express');
const router = express.Router();
const { getCorporatesSchema } = require('../controllers/admin.schema.controller');

// ❗ NO extra auth here
// ❗ admin.protected.js already protects /api/admin/*

router.get('/corporates', getCorporatesSchema);

module.exports = router;
