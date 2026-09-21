import { useEffect, useState } from 'react'
import { getDepartmentStats, getOverviewStats, getPeakHours } from '../services/api'
import './Staff.css'

function minutes(value) {
  return value === null ? 'Not enough data' : `${value} min`
}

function AdminStatistics({ onBack }) {
  const [overview, setOverview] = useState(null)
  const [departments, setDepartments] = useState([])
  const [peakHours, setPeakHours] = useState(null)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let isOpen = true

    Promise.all([getOverviewStats(), getDepartmentStats(), getPeakHours()])
      .then(([overviewData, departmentData, peakData]) => {
        if (!isOpen) return
        setOverview(overviewData)
        setDepartments(departmentData)
        setPeakHours(peakData)
        setError('')
      })
      .catch((requestError) => {
        if (isOpen) setError(requestError.message)
      })

    return () => {
      isOpen = false
    }
  }, [reloadCount])

  const busiest = peakHours ? Math.max(...peakHours.hours.map((entry) => entry.patients), 1) : 1
  const activeHours = peakHours ? peakHours.hours.filter((entry) => entry.patients > 0) : []

  return (
    <main className="staff-page">
      <section className="staff-card dashboard-card wide">
        <header className="dashboard-header">
          <div>
            <p className="staff-eyebrow">Vought+ Hospital</p>
            <h1>Hospital Statistics</h1>
          </div>
          <div className="header-actions">
            <button className="staff-secondary-button" type="button" onClick={() => setReloadCount(reloadCount + 1)}>Refresh</button>
            <button className="staff-secondary-button" type="button" onClick={onBack}>Back to Dashboard</button>
          </div>
        </header>

        {error && <p className="error-message" role="alert">{error}</p>}
        {!overview && !error && <p>Loading statistics...</p>}

        {overview && (
          <>
            <section className="stats-grid">
              <div><span>Total Patients</span><strong>{overview.totalPatients}</strong></div>
              <div><span>Total Tokens</span><strong>{overview.totalTokens}</strong></div>
              <div><span>Completed</span><strong>{overview.completed}</strong></div>
              <div><span>Waiting</span><strong>{overview.waiting}</strong></div>
              <div><span>Cancelled</span><strong>{overview.cancelled}</strong></div>
              <div><span>Avg Waiting Time</span><strong>{minutes(overview.averageWaitMinutes)}</strong></div>
            </section>

            <h2>Departments</h2>
            <div className="table-scroll">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Department</th><th>Total</th><th>Completed</th><th>Waiting</th><th>Cancelled</th>
                    <th>Doctors</th><th>Avg Wait</th><th>Avg Service</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td>{department.name}</td>
                      <td>{department.total}</td>
                      <td>{department.completed}</td>
                      <td>{department.waiting}</td>
                      <td>{department.cancelled}</td>
                      <td>{department.activeDoctors}</td>
                      <td>{minutes(department.averageWaitMinutes)}</td>
                      <td>{minutes(department.averageServiceMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>Peak Hours</h2>
            {activeHours.length === 0 && <p className="staff-note">No tokens recorded yet.</p>}
            <ul className="hour-bars">
              {activeHours.map((entry) => (
                <li key={entry.hour}>
                  <span className="hour-label">{entry.label}</span>
                  <span className="hour-track">
                    <span className="hour-bar" style={{ width: `${(entry.patients / busiest) * 100}%` }} />
                  </span>
                  <span className="hour-count">{entry.patients}</span>
                </li>
              ))}
            </ul>
            {peakHours.peak && <p className="staff-note">Busiest hour: {peakHours.peak.label} ({peakHours.peak.patients} patients)</p>}
            <p className="staff-note">Historical figures from recorded tokens. Descriptive only, not a forecast.</p>
          </>
        )}
      </section>
    </main>
  )
}

export default AdminStatistics
