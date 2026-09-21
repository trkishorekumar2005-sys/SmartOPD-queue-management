import { useCallback, useEffect, useState } from 'react'

// Every SmartOPD page has its own URL, so the browser's Back/Forward buttons and refresh work normally.
export const ROUTES = {
  home: '/',
  'patient-home': '/patient',
  'patient-details': '/patient/register',
  departments: '/patient/departments',
  token: '/patient/token',
  'queue-status': '/patient/status',
  'staff-login': '/staff/login',
  'staff-dashboard': '/staff/dashboard',
  'admin-stats': '/staff/statistics',
}

const pathToPage = Object.fromEntries(Object.entries(ROUTES).map(([page, path]) => [path, page]))
const NAV_KEY = 'smartopd.nav'

export function pageFromPath(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return pathToPage[path] || 'home'
}

// Each history entry we create stores its position (smartopdIdx). Position 0 is the first SmartOPD
// page opened in this tab, so "Back" is only offered when an earlier SmartOPD page exists and never
// leaves the app. The highest position reached (maxIdx) tells us whether "Forward" is available.
function readMaxIdx() {
  try {
    return JSON.parse(sessionStorage.getItem(NAV_KEY))?.maxIdx ?? null
  } catch {
    return null
  }
}

function writeMaxIdx(maxIdx) {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ maxIdx }))
  } catch {
    // sessionStorage may be unavailable; Forward simply stays disabled after a reload.
  }
}

function currentIdx() {
  const idx = window.history.state?.smartopdIdx
  return typeof idx === 'number' ? idx : 0
}

export function useAppNavigation() {
  const [nav, setNav] = useState(() => {
    const page = pageFromPath(window.location.pathname)
    const idx = window.history.state?.smartopdIdx

    if (typeof idx === 'number') {
      // Reload or returning to an existing entry: keep its position.
      return { page, idx, maxIdx: Math.max(readMaxIdx() ?? idx, idx) }
    }

    // First SmartOPD page in this tab. This also cleans up unknown URLs (they show Home).
    window.history.replaceState({ smartopdIdx: 0 }, '', ROUTES[page])
    writeMaxIdx(0)
    return { page, idx: 0, maxIdx: 0 }
  })

  // The browser's own Back/Forward buttons.
  useEffect(() => {
    function handlePopState() {
      const idx = currentIdx()
      setNav((previous) => ({
        page: pageFromPath(window.location.pathname),
        idx,
        maxIdx: Math.max(previous.maxIdx, idx),
      }))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Moves to a page. Opening the page we are already on does not add a history entry, and
  // { replace: true } swaps the current entry (used for redirects and after login).
  const navigate = useCallback((page, { replace = false } = {}) => {
    const path = ROUTES[page]
    const idx = currentIdx()

    if (!replace && window.location.pathname === path) {
      setNav((previous) => ({ ...previous, page }))
      return
    }

    if (replace) {
      window.history.replaceState({ smartopdIdx: idx }, '', path)
      setNav((previous) => ({ ...previous, page, idx }))
      return
    }

    // A new page discards any "forward" pages, exactly like a normal web app.
    window.history.pushState({ smartopdIdx: idx + 1 }, '', path)
    writeMaxIdx(idx + 1)
    setNav({ page, idx: idx + 1, maxIdx: idx + 1 })
  }, [])

  const goBack = useCallback(() => window.history.back(), [])
  const goForward = useCallback(() => window.history.forward(), [])

  return {
    page: nav.page,
    navigate,
    goBack,
    goForward,
    canGoBack: nav.idx > 0,
    canGoForward: nav.idx < nav.maxIdx,
  }
}
