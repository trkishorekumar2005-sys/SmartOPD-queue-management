import './PatientFlow.css'

function PatientHome({ onContinue }) {
  return (
    <main className="patient-page">
      <section className="patient-card">
        <p className="eyebrow">Welcome to</p>
        <h1>Vought+ Hospital, Chennai</h1>
        <p className="page-description">
          Select a department and receive a queue token for your OPD visit.
        </p>
        <button className="primary-button" type="button" onClick={onContinue}>
          Continue as Patient
        </button>
      </section>
    </main>
  )
}

export default PatientHome
