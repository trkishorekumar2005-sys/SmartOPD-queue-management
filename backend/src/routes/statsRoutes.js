const express = require('express')
const { overview, departments, peakHours } = require('../controllers/statsController')
const authenticateStaff = require('../middleware/authenticateStaff')

const router = express.Router()

// Hospital statistics are for logged-in staff only.
router.use(authenticateStaff)
router.get('/overview', overview)
router.get('/departments', departments)
router.get('/peak-hours', peakHours)

module.exports = router
