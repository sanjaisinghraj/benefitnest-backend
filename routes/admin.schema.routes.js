const express = require('express');
const router = express.Router();
const { getCorporatesSchema } = require('../controllers/admin.schema.controller');
const { verifyAdminToken } = require('../middleware/adminAuth');

router.get('/corporates', verifyAdminToken, getCorporatesSchema);

module.exports = router;
