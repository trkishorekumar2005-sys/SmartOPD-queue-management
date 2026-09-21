const { createToken, getTokenStatus, cancelToken } = require('../services/tokenService')
const { isPositiveInteger, parseIdParam } = require('../utils/validation')

async function generateToken(req, res, next) {
  try {
    const { patientId, departmentId } = req.body

    if (!isPositiveInteger(patientId) || !isPositiveInteger(departmentId)) {
      return res.status(400).json({ success: false, message: 'patientId and departmentId must be valid numbers.' })
    }

    const token = await createToken(patientId, departmentId)
    res.status(201).json({ message: 'Token generated successfully.', token })
  } catch (error) {
    next(error)
  }
}

async function getStatus(req, res, next) {
  try {
    const tokenId = parseIdParam(req.params.id)
    if (tokenId === null) {
      return res.status(400).json({ success: false, message: 'Token id must be a valid number.' })
    }

    res.json(await getTokenStatus(tokenId))
  } catch (error) {
    next(error)
  }
}

async function cancel(req, res, next) {
  try {
    const tokenId = parseIdParam(req.params.id)
    if (tokenId === null) {
      return res.status(400).json({ success: false, message: 'Token id must be a valid number.' })
    }

    const token = await cancelToken(tokenId)
    res.json({ message: 'Token cancelled successfully.', token })
  } catch (error) {
    next(error)
  }
}

module.exports = { generateToken, getStatus, cancel }
