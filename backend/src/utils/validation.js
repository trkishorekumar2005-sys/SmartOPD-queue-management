// Shared request validation helpers. Backend validation is the source of truth;
// the React forms only mirror these rules to give faster feedback.

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

// For values that arrive as strings in a URL or query string ("12"). Returns the number, or null.
function parseIdParam(value) {
  return typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null
}

module.exports = { isPositiveInteger, parseIdParam }
