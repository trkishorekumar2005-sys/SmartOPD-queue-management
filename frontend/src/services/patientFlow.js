// Keeps the patient's progress (registration, chosen department, token) for this browser tab only,
// so Back/Forward and a page refresh return to the same data instead of starting over or creating
// a second patient or token. sessionStorage is cleared automatically when the tab is closed.
const KEY = 'smartopd.patientFlow'

export function loadPatientFlow() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function savePatientFlow(flow) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flow))
  } catch {
    // Ignore: the flow still works, it just will not survive a refresh.
  }
}

export function clearPatientFlow() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
