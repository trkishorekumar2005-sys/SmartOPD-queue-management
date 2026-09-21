// Runs `load` immediately and then every `intervalMs` (plain setInterval polling).
// A tick is skipped while the previous request is still in flight, so slow responses
// never pile up. `load` receives an `isActive()` function so it can ignore a response
// that arrives after polling was stopped. Call the returned `stop()` to clear the interval.
export function startPolling(load, intervalMs = 5000) {
  let isActive = true
  let isLoading = false

  async function run() {
    if (isLoading || !isActive) return
    isLoading = true
    try {
      await load(() => isActive)
    } catch (error) {
      console.error('Polling request failed:', error)
    } finally {
      isLoading = false
    }
  }

  run()
  const timer = setInterval(run, intervalMs)

  return function stop() {
    isActive = false
    clearInterval(timer)
  }
}
