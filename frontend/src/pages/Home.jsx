import RoleButton from '../components/RoleButton'
import './Home.css'

function Home({ onPatientClick, onStaffClick }) {
  return (
    <main className="home-page">
      <section className="welcome-card">
        <h1>SmartOPD</h1>
        <p>Intelligent Hospital OPD Queue Management System</p>

        <div className="role-buttons">
          <RoleButton label="Patient" onClick={onPatientClick} />
          <RoleButton label="Staff" onClick={onStaffClick} />
        </div>
      </section>
    </main>
  )
}

export default Home
