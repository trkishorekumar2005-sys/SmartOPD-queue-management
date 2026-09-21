// Every error response has the same shape: { "success": false, "message": "..." }.
//
// Errors we raise on purpose (or that body-parser raises for bad JSON) carry a statusCode and a
// message that is safe to show. Anything else is unexpected (e.g. a MySQL error), so only a generic
// message is sent to the client. Stack traces, SQL and request bodies are never logged or returned.

const databaseUnavailableCodes = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
])

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message })
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  console.error(`${error.code || error.name || 'Error'}: ${error.message}`)

  if (error.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Request body is not valid JSON.')
  }

  if (error.type === 'entity.too.large') {
    return sendError(res, 413, 'Request body is too large.')
  }

  if (error.statusCode) {
    return sendError(res, error.statusCode, error.message)
  }

  if (databaseUnavailableCodes.has(error.code) || error.errno === -4078) {
    return sendError(res, 503, 'The service is temporarily unavailable. Please try again shortly.')
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return sendError(res, 409, 'That record already exists.')
  }

  sendError(res, 500, 'Internal server error.')
}

function notFoundHandler(req, res) {
  sendError(res, 404, 'Route not found.')
}

module.exports = errorHandler
module.exports.notFoundHandler = notFoundHandler
