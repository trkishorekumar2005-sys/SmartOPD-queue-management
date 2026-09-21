import { useEffect, useState } from 'react'
import {
  callNext,
  cancelToken,
  completeAndCallNext,
  completeCurrent,
  getDepartments,
  getQueue,
} from '../services/api'
import { getStaffProfile } from '../services/auth'
import { usePolling } from '../hooks/usePolling'
import './Staff.css'

function StaffDashboard({ onLogout, onOpenStats }) {
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState(null)
  const [queue, setQueue] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const staff = getStaffProfile()

  useEffect(() => {
    getDepartments()
      .then((list) => {
        setDepartments(list)
        // Open on the staff member's own department when known, otherwise the first one.
        const ownDepartment = list.find((department) => department.id === getStaffProfile()?.departmentId)
        setDepartmentId((ownDepartment || list[0])?.id ?? null)
      })
      .catch((requestError) => setError(requestError.message))
  }, [])

  // Refreshes the selected department's queue every 5 seconds; stops on unmount.
  usePolling(async (isActive) => {
    try {
      const latestQueue = await getQueue(departmentId)
      if (isActive()) {
        setQueue(latestQueue)
        setError('')
      }
    } catch (requestError) {
      if (isActive()) setError(requestError.message)
    }
  }, departmentId)

  function selectDepartment(id) {
    setDepartmentId(id)
    setQueue(null)
    setMessage('')
    setError('')
  }

  // Runs a staff action, shows its result, then reloads the queue from the backend.
  async function runAction(action) {
    setIsBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await action()
      setMessage(result.message)
      setQueue(await getQueue(departmentId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsBusy(false)
    }
  }

  function handleCancel(token) {
    if (!window.confirm(`Cancel token ${token.token_number} for ${token.patient_name}?`)) return
    runAction(() => cancelToken(token.id))
  }

  if (!queue) {
    return (
      <main className="staff-page">
        <section className="staff-card">
          {error ? <p className="error-message">{error}</p> : <p>Loading dashboard...</p>}
          <button className="staff-secondary-button" type="button" onClick={onLogout}>Logout</button>
        </section>
      </main>
    )
  }

  const hasServing = Boolean(queue.serving)
  const hasWaiting = queue.waiting.length > 0

  return (
    <main className="staff-page">
      <section className="staff-card dashboard-card">
        <header className="dashboard-header">
          <div>
            <p className="staff-eyebrow">Vought+ Hospital</p>
            <h1>{queue.department.name} Dashboard</h1>
          </div>
          <div className="header-actions">
            {staff && <span className="room-badge">{staff.name}</span>}
            <button className="staff-secondary-button" type="button" onClick={onOpenStats}>Statistics</button>
            <button className="staff-secondary-button" type="button" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <nav className="department-tabs" aria-label="Departments">
          {departments.map((department) => (
            <button
              key={department.id}
              type="button"
              className={department.id === departmentId ? 'tab-button active' : 'tab-button'}
              onClick={() => selectDepartment(department.id)}
            >
              {department.name}
            </button>
          ))}
        </nav>

        {message && <p className="staff-message" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}

        <section className="serving-section">
          <p>Currently Serving</p>
          <strong>{queue.serving?.token_number || 'No patient'}</strong>
          {queue.serving && <p>{queue.serving.patient_name}</p>}
        </section>

        <section>
          <h2>Waiting ({queue.waitingCount})</h2>
          {!hasWaiting && <p className="staff-note">No waiting patients</p>}
          <ol className="waiting-rows">
            {queue.waiting.map((token) => (
              <li key={token.id}>
                <span className="position">#{token.position}</span>
                <strong>{token.token_number}</strong>
                <span className="patient-name">{token.patient_name}</span>
                <span className="wait-estimate">~{token.estimated_wait_minutes} min (est.)</span>
                <button className="cancel-button" type="button" onClick={() => handleCancel(token)} disabled={isBusy}>
                  Cancel
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="dashboard-metrics">
          <div><span>Patients Waiting</span><strong>{queue.waitingCount}</strong></div>
          <div>
            <span>Avg Service Time ({queue.estimate.source === 'HISTORICAL' ? 'from history' : 'default'})</span>
            <strong>{queue.estimate.averageServiceMinutes} minutes</strong>
          </div>
          <div><span>Active Doctors</span><strong>{queue.estimate.activeDoctors}</strong></div>
        </section>

        <div className="action-row">
          <button
            className="staff-primary-button"
            type="button"
            onClick={() => runAction(() => callNext(departmentId))}
            disabled={isBusy || hasServing || !hasWaiting}
          >
            Call Next
          </button>
          <button
            className="staff-primary-button"
            type="button"
            onClick={() => runAction(() => completeCurrent(departmentId))}
            disabled={isBusy || !hasServing}
          >
            Complete
          </button>
          <button
            className="staff-primary-button"
            type="button"
            onClick={() => runAction(() => completeAndCallNext(departmentId))}
            disabled={isBusy || (!hasServing && !hasWaiting)}
          >
            {isBusy ? 'Working...' : 'Complete & Call Next'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default StaffDashboard
