const { verifyStaffToken } = require('../config/jwt')

function authenticateStaff(req, res, next) {
  const authorization = req.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null

  if (!token) {
    return res.status(401).json({ success: false, message: 'Staff authentication is required.' })
  }

  try {
    const payload = verifyStaffToken(token)

    // Only tokens issued by our own login carry a numeric staffId.
    if (!Number.isSafeInteger(payload.staffId)) {
      return res.status(401).json({ success: false, message: 'Your login token is invalid.' })
    }

    req.staff = payload
    next()
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Your login token is invalid.'
    res.status(401).json({ success: false, message })
  }
}

module.exports = authenticateStaff
