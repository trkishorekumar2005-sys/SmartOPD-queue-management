import { useState } from 'react'
import { getQueue, getTokenStatus } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import StatusBadge from '../components/StatusBadge'
import './PatientFlow.css'

const statusMessages = {
  WAITING: 'Please wait. Your token will be called soon.',
  SERVING: 'It is your turn. Please proceed to the consultation room.',
  COMPLETED: 'Your consultation is complete. Thank you.',
  CANCELLED: 'This token was cancelled. Please contact the reception.',
}

function QueueStatus({ tokenId }) {
  const [token, setToken] = useState(null)
  const [queue, setQueue] = useState(null)
  const [error, setError] = useState('')

  usePolling(async (isActive) => {
    try {
      const latestToken = await getTokenStatus(tokenId)
      const latestQueue = await getQueue(latestToken.department.id)
      if (isActive()) {
        setToken(latestToken)
        setQueue(latestQueue)
        setError('')
      }
    } catch (requestError) {
      if (isActive()) setError(requestError.message)
    }
  }, tokenId)

  if (!token && error) {
    return <main className="patient-page"><section className="patient-card"><p className="error-message">{error}</p></section></main>
  }

  if (!token || !queue) {
    return <main className="patient-page"><section className="patient-card"><p>Loading queue status...</p></section></main>
  }

  const isWaiting = token.status === 'WAITING'

  return (
    <main className="patient-page">
      <section className="patient-card">
        <p className="eyebrow">Live Queue Status</p>
        <h1>Queue Status</h1>
        <p className="page-description">Hello, {token.patient.name}. This page refreshes every 5 seconds.</p>
        {error && <p className="error-message">Connection problem. Showing the last known status.</p>}

        <div className="queue-grid">
          <div className="queue-item">
            <span>Department</span>
            <strong>{token.department.name}</strong>
          </div>
          <div className="queue-item">
            <span>Your Token</span>
            <strong>{token.tokenNumber}</strong>
          </div>
          <div className="queue-item">
            <span>Status</span>
            <strong><StatusBadge status={token.status} /></strong>
          </div>
          <div className="queue-item">
            <span>Now Serving</span>
            <strong>{queue.serving?.token_number || 'None'}</strong>
          </div>
          {isWaiting && (
            <>
              <div className="queue-item">
                <span>Queue Position</span>
                <strong>{token.queuePosition}</strong>
              </div>
              <div className="queue-item">
                <span>Patients Ahead</span>
                <strong>{token.patientsAhead}</strong>
              </div>
              <div className="queue-item">
                <span>Estimated Wait</span>
                <strong>About {token.estimatedWaitMinutes} minutes</strong>
              </div>
            </>
          )}
        </div>

        <p className="status-message">{statusMessages[token.status]}</p>
        {isWaiting && (
          <p className="estimate-note">
            Estimate only. {token.patientsAhead} patient(s) ahead, {token.activeDoctors} active doctor(s), about{' '}
            {token.averageServiceMinutes} minutes per patient (
            {token.estimateSource === 'HISTORICAL' ? 'based on recent visits' : 'hospital default'}). Actual time may vary.
          </p>
        )}
      </section>
    </main>
  )
}

export default QueueStatus
