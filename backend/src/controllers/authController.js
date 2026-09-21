const bcrypt = require('bcrypt')
const { signStaffToken } = require('../config/jwt')
const { pool } = require('../config/db')

// Staff passwords are stored only as bcrypt hashes and are never logged or returned.
// When the employee ID does not exist we still run one bcrypt comparison against this dummy
// hash, so a wrong ID and a wrong password take about the same time (no user enumeration).
const dummyHash = bcrypt.hashSync('smartopd-not-a-real-password', 10)

async function login(req, res, next) {
  try {
    const { employeeId, password } = req.body
    if (typeof employeeId !== 'string' || typeof password !== 'string' || !employeeId.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Employee ID and password are required.' })
    }

    // employee_id is VARCHAR(50); bcrypt only reads the first 72 bytes, so longer input is never valid.
    if (employeeId.trim().length > 50 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ success: false, message: 'Employee ID or password is too long.' })
    }

    const [[staffMember]] = await pool.execute(
      `SELECT id, employee_id, name, role, department_id, password_hash
       FROM staff WHERE employee_id = ?`,
      [employeeId.trim()],
    )

    const passwordMatches = await bcrypt.compare(password, staffMember ? staffMember.password_hash : dummyHash)

    if (!staffMember || !passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid employee ID or password.' })
    }

    const token = signStaffToken({
      staffId: staffMember.id,
      employeeId: staffMember.employee_id,
      role: staffMember.role,
    })

    res.json({
      message: 'Login successful.',
      token,
      staff: {
        id: staffMember.id,
        name: staffMember.name,
        role: staffMember.role,
        departmentId: staffMember.department_id,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { login }
