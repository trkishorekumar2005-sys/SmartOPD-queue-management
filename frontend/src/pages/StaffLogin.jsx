import { useState } from 'react'
import { loginStaff } from '../services/api'
import { saveStaffSession } from '../services/auth'
import './Staff.css'

function StaffLogin({ notice, onLogin }) {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Mirrors the backend limits in authController.js (the backend always validates too).
    if (!employeeId.trim() || !password) {
      setError('Please enter your employee ID and password.')
      return
    }
    if (employeeId.trim().length > 50 || password.length > 72) {
      setError('Employee ID or password is too long.')
      return
    }

    setIsLoggingIn(true)
    try {
      const result = await loginStaff(employeeId.trim(), password)
      saveStaffSession(result.token, result.staff)
      setPassword('')
      onLogin()
    } catch (requestError) {
      setError(requestError.message)
      setIsLoggingIn(false)
    }
  }

  return (
    <main className="staff-page">
      <section className="staff-card login-card">
        <p className="staff-eyebrow">Vought+ Hospital</p>
        <h1>Staff Login</h1>
        {notice && !error && <p className="error-message" role="alert">{notice}</p>}
        <form className="staff-form" onSubmit={handleSubmit}>
          <label htmlFor="employee-id">Employee ID</label>
          <input id="employee-id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} autoComplete="username" required />
          <label htmlFor="staff-password">Password</label>
          <input id="staff-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          {error && <p className="error-message">{error}</p>}
          <button className="staff-primary-button" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default StaffLogin
