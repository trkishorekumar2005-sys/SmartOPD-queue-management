import { UNAUTHORIZED_EVENT, clearStaffSession, getStaffToken } from './auth'

const API_URL = 'http://localhost:5000/api'

async function request(path, options = {}) {
  const token = getStaffToken()
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Please check your connection and try again.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    // A 401 on any protected request means the staff token is missing, invalid or expired.
    if (response.status === 401 && path !== '/auth/login') {
      clearStaffSession()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }

    const error = new Error(data.message || 'Something went wrong.')
    error.status = response.status
    throw error
  }

  return data
}

function postDepartmentAction(path, departmentId) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify({ departmentId }),
  })
}

export function loginStaff(employeeId, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ employeeId, password }),
  })
}

export function getDepartments() {
  return request('/departments')
}

export function createPatient(patient) {
  return request('/patients', {
    method: 'POST',
    body: JSON.stringify(patient),
  })
}

export function createToken(patientId, departmentId) {
  return request('/tokens', {
    method: 'POST',
    body: JSON.stringify({ patientId, departmentId }),
  })
}

export function getTokenStatus(tokenId) {
  return request(`/tokens/${tokenId}`)
}

export function cancelToken(tokenId) {
  return request(`/tokens/${tokenId}/cancel`, { method: 'POST' })
}

export function getQueue(departmentId) {
  return request(`/queue/${departmentId}`)
}

export function callNext(departmentId) {
  return postDepartmentAction('/queue/call-next', departmentId)
}

export function completeCurrent(departmentId) {
  return postDepartmentAction('/queue/complete', departmentId)
}

export function completeAndCallNext(departmentId) {
  return postDepartmentAction('/queue/complete-and-call-next', departmentId)
}

export function getOverviewStats() {
  return request('/stats/overview')
}

export function getDepartmentStats() {
  return request('/stats/departments')
}

export function getPeakHours() {
  return request('/stats/peak-hours')
}
