const TOKEN_KEY = 'staffToken'
const PROFILE_KEY = 'staffProfile'

export const UNAUTHORIZED_EVENT = 'smartopd:unauthorized'

function readTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function clearStaffSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // Storage may be unavailable; nothing to clear.
  }
}

export function saveStaffSession(token, staff) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(PROFILE_KEY, JSON.stringify(staff))
}

// Returns the stored JWT, or null when it is missing, malformed or already expired.
export function getStaffToken() {
  let token = null
  try {
    token = localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
  if (!token) return null

  const payload = readTokenPayload(token)
  if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) {
    clearStaffSession()
    return null
  }

  return token
}

export function getStaffProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY))
  } catch {
    return null
  }
}
