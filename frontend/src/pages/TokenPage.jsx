import { useEffect, useRef, useState } from 'react'
import { createToken } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import './PatientFlow.css'

// Shows the patient's token. If a token already exists for this patient and department
// (for example after Back/Forward or a refresh) it is shown as-is; a new one is only created once.
function TokenPage({ department, patient, existingToken, onTokenReady, onViewQueue }) {
  const [token, setToken] = useState(existingToken)
  const [error, setError] = useState('')
  const requested = useRef(false)

  useEffect(() => {
    if (token || requested.current) return
    requested.current = true

    createToken(patient.id, department.id)
      .then((result) => {
        setToken(result.token)
        onTokenReady(result.token)
      })
      .catch((requestError) => setError(requestError.message))
  }, [token, department.id, patient.id, onTokenReady])

  if (error) {
    return <main className="patient-page"><section className="patient-card"><p className="error-message">{error}</p></section></main>
  }

  if (!token) {
    return <main className="patient-page"><section className="patient-card"><p>Generating your token...</p></section></main>
  }

  return (
    <main className="patient-page">
      <section className="patient-card">
        <p className="eyebrow">Token Generated</p>
        <h1>Your OPD Token</h1>
        <div className="token-box">
          <span>Your Token</span>
          <strong>{token.tokenNumber}</strong>
        </div>
        <p className="token-details">Patient: {patient.name}</p>
        <p className="token-details">Department: {token.department}</p>
        <p className="token-details">Status: <StatusBadge status={token.status} /></p>
        <button className="primary-button" type="button" onClick={onViewQueue}>
          View Queue Status
        </button>
      </section>
    </main>
  )
}

export default TokenPage
