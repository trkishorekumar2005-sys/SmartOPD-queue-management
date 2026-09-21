const express = require('express')
const { checkDatabaseConnection } = require('../config/db')

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    await checkDatabaseConnection()
    res.json({ message: 'SmartOPD backend and MySQL connection are working.' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
