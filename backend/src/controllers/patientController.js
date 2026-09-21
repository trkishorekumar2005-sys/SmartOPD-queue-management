const { createPatient } = require('../services/patientService')

const allowedGenders = ['MALE', 'FEMALE', 'OTHER']
const mobilePattern = /^\+?[0-9][0-9 -]{6,18}$/

async function registerPatient(req, res, next) {
  try {
    const { name, age, gender, mobile } = req.body
    const numericAge = typeof age === 'number' || typeof age === 'string' ? Number(age) : NaN

    if (
      typeof name !== 'string' ||
      typeof mobile !== 'string' ||
      !name.trim() ||
      !mobile.trim() ||
      !Number.isInteger(numericAge)
    ) {
      return res.status(400).json({ success: false, message: 'Name, valid age, gender, and mobile are required.' })
    }

    if (numericAge < 1 || numericAge > 120 || !allowedGenders.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Age or gender is invalid.' })
    }

    if (name.trim().length > 150 || !mobilePattern.test(mobile.trim())) {
      return res.status(400).json({ success: false, message: 'Name or mobile number is invalid.' })
    }

    const patientId = await createPatient({
      name: name.trim(),
      age: numericAge,
      gender,
      mobile: mobile.trim(),
    })

    res.status(201).json({ message: 'Patient registered successfully.', patientId })
  } catch (error) {
    next(error)
  }
}

module.exports = { registerPatient }
