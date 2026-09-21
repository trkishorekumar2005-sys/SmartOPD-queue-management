const express = require('express')
const { generateToken, getStatus, cancel } = require('../controllers/tokenController')
const authenticateStaff = require('../middleware/authenticateStaff')

const router = express.Router()

router.post('/', generateToken)
router.get('/:id', getStatus)
router.post('/:id/cancel', authenticateStaff, cancel)

module.exports = router
