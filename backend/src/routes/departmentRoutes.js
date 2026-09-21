const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const [departments] = await pool.execute(
      'SELECT id, name, code FROM departments ORDER BY name',
    )
    res.json(departments)
  } catch (error) {
    next(error)
  }
})

module.exports = router
