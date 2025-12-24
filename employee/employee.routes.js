const express = require("express");
const router = express.Router();
const {
  uploadEmployees,
  uploadDependents,
  listEmployees
} = require("./employee.controller");

/* EMPLOYEE */
router.post("/upload", uploadEmployees);
router.get("/", listEmployees);

/* DEPENDENT */
router.post("/dependents/upload", uploadDependents);

module.exports = router;
