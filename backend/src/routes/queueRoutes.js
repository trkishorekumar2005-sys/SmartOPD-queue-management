const express = require('express')
const {
  getDepartmentQueue,
  callNext,
  complete,
  completeAndCallNext,
} = require('../controllers/queueController')
const authenticateStaff = require('../middleware/authenticateStaff')

const router = express.Router()

router.get('/:departmentId', getDepartmentQueue)
router.post('/call-next', authenticateStaff, callNext)
router.post('/complete', authenticateStaff, complete)
router.post('/complete-and-call-next', authenticateStaff, completeAndCallNext)

module.exports = router
