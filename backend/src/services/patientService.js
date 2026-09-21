const { pool } = require('../config/db')

async function createPatient({ name, age, gender, mobile }) {
  const [result] = await pool.execute(
    `INSERT INTO patients (name, age, gender, mobile)
     VALUES (?, ?, ?, ?)`,
    [name, age, gender, mobile],
  )

  return result.insertId
}

module.exports = { createPatient }
