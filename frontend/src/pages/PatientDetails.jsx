import { useState } from 'react'
import './PatientFlow.css'

// Mirrors the backend rules in patientController.js.
const mobilePattern = /^\+?[0-9][0-9 -]{6,18}$/

function validate({ name, age, gender, mobile }) {
  const errors = {}
  const numericAge = Number(age)

  if (!name.trim()) errors.name = 'Please enter your full name.'
  else if (name.trim().length > 150) errors.name = 'Name must be 150 characters or fewer.'

  if (age === '' || !Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
    errors.age = 'Enter a valid age between 1 and 120.'
  }

  if (!gender) errors.gender = 'Please select a gender.'

  if (!mobilePattern.test(mobile.trim())) {
    errors.mobile = 'Enter a valid mobile number, e.g. 9876543210 or +91 98765 43210.'
  }

  return errors
}

function PatientDetails({ initialValues, onSubmit }) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [age, setAge] = useState(initialValues ? String(initialValues.age) : '')
  const [gender, setGender] = useState(initialValues?.gender ?? '')
  const [mobile, setMobile] = useState(initialValues?.mobile ?? '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const errors = validate({ name, age, gender, mobile })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), age: Number(age), gender, mobile: mobile.trim() })
    } catch (requestError) {
      setError(requestError.message)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="patient-page">
      <section className="patient-card">
        <p className="eyebrow">Step 1 of 2</p>
        <h1>Patient Registration</h1>
        <p className="page-description">Enter your details to register. You will choose a department next.</p>

        <form className="patient-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="patient-name">Full name</label>
          <input
            id="patient-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}

          <label htmlFor="patient-age">Age</label>
          <input
            id="patient-age"
            type="number"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder="Enter your age"
            min="1"
            max="120"
            aria-invalid={Boolean(fieldErrors.age)}
          />
          {fieldErrors.age && <p className="field-error">{fieldErrors.age}</p>}

          <label htmlFor="patient-gender">Gender</label>
          <select
            id="patient-gender"
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            aria-invalid={Boolean(fieldErrors.gender)}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          {fieldErrors.gender && <p className="field-error">{fieldErrors.gender}</p>}

          <label htmlFor="patient-mobile">Mobile number</label>
          <input
            id="patient-mobile"
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="Enter your mobile number"
            aria-invalid={Boolean(fieldErrors.mobile)}
          />
          {fieldErrors.mobile && <p className="field-error">{fieldErrors.mobile}</p>}

          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register & Continue'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default PatientDetails
