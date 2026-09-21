const jwt = require('jsonwebtoken')

// The secret is only ever read from the environment (.env); it is never hard-coded,
// logged or sent to clients. Only HS256 is accepted, so tokens using another algorithm
// (including "none") are rejected.
const algorithm = 'HS256'

function signStaffToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  })
}

function verifyStaffToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [algorithm] })
}

module.exports = { signStaffToken, verifyStaffToken }
