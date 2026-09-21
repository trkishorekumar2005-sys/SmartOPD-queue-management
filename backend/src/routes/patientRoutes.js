const express = require('express')
const { registerPatient } = require('../controllers/patientController')

const router = express.Router()

router.post('/', registerPatient)

module.exports = router
