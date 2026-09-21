import { useCallback, useEffect, useState } from 'react'
import Home from './pages/Home'
import PatientHome from './pages/PatientHome'
import DepartmentSelection from './pages/DepartmentSelection'
import PatientDetails from './pages/PatientDetails'
import TokenPage from './pages/TokenPage'
import QueueStatus from './pages/QueueStatus'
import StaffLogin from './pages/StaffLogin'
import StaffDashboard from './pages/StaffDashboard'
import DisplayScreen from './pages/DisplayScreen'
import AdminStatistics from './pages/AdminStatistics'
import HistoryButtons from './components/HistoryButtons'
import { createPatient } from './services/api'
import { UNAUTHORIZED_EVENT, clearStaffSession, getStaffToken } from './services/auth'
import { clearPatientFlow, loadPatientFlow, savePatientFlow } from './services/patientFlow'
import { useAppNavigation } from './navigation'

const patientFields = ['name', 'age', 'gender', 'mobile']

// Pages that need earlier steps (or a login) are redirected to the step they are missing.
// This keeps refresh, typed URLs and the browser's Back/Forward buttons safe.
function resolvePage(page, { isStaff, patientDetails, selectedDepartment, hasToken }) {
  if ((page === 'staff-dashboard' || page === 'admin-stats') && !isStaff) return 'staff-login'
  if (page === 'staff-login' && isStaff) return 'staff-dashboard'
  if (page === 'departments' && !patientDetails) return 'patient-details'
  if (page === 'token' || page === 'queue-status') {
    if (!patientDetails) return 'patient-details'
    if (!selectedDepartment) return 'departments'
    if (page === 'queue-status' && !hasToken) return 'token'
  }
  return page
}

function SmartOpdApp() {
  const { page: requestedPage, navigate, goBack, goForward, canGoBack, canGoForward } = useAppNavigation()
  const [flow, setFlow] = useState(loadPatientFlow)
  const [loginNotice, setLoginNotice] = useState('')
  const [, setSessionVersion] = useState(0) // bumped so the login guard re-runs after a session ends

  const { patientDetails, selectedDepartment, tokenResult } = flow
  const hasToken = Boolean(
    tokenResult &&
      patientDetails &&
      selectedDepartment &&
      tokenResult.patientId === patientDetails.id &&
      tokenResult.departmentId === selectedDepartment.id,
  )
  const page = resolvePage(requestedPage, {
    isStaff: Boolean(getStaffToken()),
    patientDetails,
    selectedDepartment,
    hasToken,
  })

  useEffect(() => {
    if (page !== requestedPage) navigate(page, { replace: true })
  }, [page, requestedPage, navigate])

  useEffect(() => {
    savePatientFlow(flow)
  }, [flow])

  // Any protected request that comes back 401 ends the session; the guard above then shows the login page.
  useEffect(() => {
    function handleUnauthorized() {
      setLoginNotice('Your session has expired or is invalid. Please log in again.')
      setSessionVersion((version) => version + 1)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  function startPatientFlow() {
    clearPatientFlow() // a new patient starts from a clean form
    setFlow({})
    navigate('patient-home')
  }

  // Patient flow: register -> select department -> generate token -> queue status.
  async function savePatientDetails(details) {
    const unchanged = patientDetails && patientFields.every((field) => patientDetails[field] === details[field])

    // Coming back to the form and pressing Register again with the same details must not create a second patient.
    if (!unchanged) {
      const result = await createPatient(details)
      setFlow({ patientDetails: { id: result.patientId, ...details }, selectedDepartment: null, tokenResult: null })
    }

    navigate('departments')
  }

  function chooseDepartment(department) {
    setFlow((previous) => {
      const keepToken =
        previous.tokenResult &&
        previous.tokenResult.patientId === previous.patientDetails.id &&
        previous.tokenResult.departmentId === department.id

      // Choosing the same department again reuses the token instead of issuing a duplicate.
      return { ...previous, selectedDepartment: department, tokenResult: keepToken ? previous.tokenResult : null }
    })
    navigate('token')
  }

  const handleTokenReady = useCallback((token) => {
    setFlow((previous) => ({
      ...previous,
      tokenResult: { patientId: previous.patientDetails.id, departmentId: previous.selectedDepartment.id, token },
    }))
  }, [])

  function startStaffFlow() {
    setLoginNotice('')
    navigate(getStaffToken() ? 'staff-dashboard' : 'staff-login')
  }

  function logoutStaff() {
    clearStaffSession()
    setSessionVersion((version) => version + 1)
    setLoginNotice('')
    navigate('home')
  }

  function renderPage() {
    switch (page) {
      case 'patient-home':
        return <PatientHome onContinue={() => navigate('patient-details')} />
      case 'patient-details':
        return <PatientDetails initialValues={patientDetails} onSubmit={savePatientDetails} />
      case 'departments':
        return <DepartmentSelection patientName={patientDetails?.name} onSelect={chooseDepartment} />
      case 'token':
        return (
          <TokenPage
            department={selectedDepartment}
            patient={patientDetails}
            existingToken={hasToken ? tokenResult.token : null}
            onTokenReady={handleTokenReady}
            onViewQueue={() => navigate('queue-status')}
          />
        )
      case 'queue-status':
        return <QueueStatus tokenId={tokenResult.token.id} />
      case 'staff-login':
        return <StaffLogin notice={loginNotice} onLogin={() => navigate('staff-dashboard', { replace: true })} />
      case 'staff-dashboard':
        return <StaffDashboard onLogout={logoutStaff} onOpenStats={() => navigate('admin-stats')} />
      case 'admin-stats':
        return <AdminStatistics onBack={() => (canGoBack ? goBack() : navigate('staff-dashboard'))} />
      default:
        return <Home onPatientClick={startPatientFlow} onStaffClick={startStaffFlow} />
    }
  }

  return (
    <div className="app-shell">
      {(canGoBack || canGoForward) && (
        <HistoryButtons canGoBack={canGoBack} canGoForward={canGoForward} onBack={goBack} onForward={goForward} />
      )}
      {renderPage()}
    </div>
  )
}

function App() {
  // The waiting-room display is a standalone page with no navigation.
  if (window.location.pathname === '/display') {
    return <DisplayScreen />
  }

  return <SmartOpdApp />
}

export default App
