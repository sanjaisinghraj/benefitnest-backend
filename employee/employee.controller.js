const pool = require("../db");

/* =========================
   UPLOAD EMPLOYEES
========================= */
exports.uploadEmployees = async (req, res) => {
  try {
    const employees = req.body; // array of employees

    for (const emp of employees) {
      await pool.query(
        `
        INSERT INTO employees (
          emp_code,
          official_email,
          department,
          designation,
          profile,
          status
        )
        VALUES ($1,$2,$3,$4,$5,'ACTIVE')
        ON CONFLICT (emp_code) DO UPDATE
        SET
          official_email = EXCLUDED.official_email,
          department = EXCLUDED.department,
          designation = EXCLUDED.designation,
          profile = EXCLUDED.profile
        `,
        [
          emp.emp_code,
          emp.official_email,
          emp.department,
          emp.designation,
          emp.profile || {}
        ]
      );
    }

    res.json({ success: true, message: "Employees uploaded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Employee upload failed" });
  }
};

/* =========================
   UPLOAD DEPENDENTS
========================= */
exports.uploadDependents = async (req, res) => {
  try {
    const dependents = req.body; // array

    for (const dep of dependents) {
      const emp = await pool.query(
        `SELECT employee_id FROM employees WHERE emp_code = $1`,
        [dep.emp_code]
      );

      if (emp.rows.length === 0) continue;

      await pool.query(
        `
        INSERT INTO dependents (
          employee_id,
          relation,
          details,
          active
        )
        VALUES ($1,$2,$3,true)
        `,
        [
          emp.rows[0].employee_id,
          dep.relation,
          dep.details || {}
        ]
      );
    }

    res.json({ success: true, message: "Dependents uploaded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Dependent upload failed" });
  }
};

/* =========================
   LIST EMPLOYEES
========================= */
exports.listEmployees = async (req, res) => {
  const result = await pool.query(
    `SELECT employee_id, emp_code, official_email, department FROM employees`
  );
  res.json(result.rows);
};
