import { useEffect, useState } from 'react'
import { getDepartments } from '../services/api'
import './PatientFlow.css'

function DepartmentSelection({ patientName, onSelect }) {
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getDepartments().then(setDepartments).catch((requestError) => setError(requestError.message))
  }, [])

  return (
    <main className="patient-page">
      <section className="patient-card">
        <p className="eyebrow">Step 2 of 2</p>
        {patientName && <p className="success-message" role="status">Registration successful, {patientName}.</p>}
        <h1>Select a Department</h1>
        <p className="page-description">Choose the department you want to visit.</p>

        {error && <p className="error-message">{error}</p>}
        {!error && departments.length === 0 && <p>Loading departments...</p>}
        <div className="department-list">
          {departments.map((department) => (
            <button
              className="department-button"
              key={department.id}
              type="button"
              onClick={() => onSelect(department)}
            >
              {department.name}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default DepartmentSelection
