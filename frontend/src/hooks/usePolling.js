import { useEffect, useRef } from 'react'
import { startPolling } from '../services/polling'

export const POLLING_INTERVAL_MS = 5000

// Polls `load` every 5 seconds while the component is mounted. Polling restarts when
// `resetKey` changes (e.g. a different department) and is off while `resetKey` is null.
// The interval is always cleared on unmount, so no timer outlives the component.
export function usePolling(load, resetKey) {
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (resetKey === null) return undefined
    return startPolling((isActive) => loadRef.current(isActive), POLLING_INTERVAL_MS)
  }, [resetKey])
}
