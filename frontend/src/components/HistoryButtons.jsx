import './HistoryButtons.css'

// Back / Forward through the SmartOPD pages the user has visited (never leaves the app).
function HistoryButtons({ canGoBack, canGoForward, onBack, onForward }) {
  return (
    <nav className="history-buttons" aria-label="Page history">
      <button type="button" onClick={onBack} disabled={!canGoBack} aria-label="Go back to the previous page">
        ← Back
      </button>
      <button type="button" onClick={onForward} disabled={!canGoForward} aria-label="Go forward to the next page">
        Forward →
      </button>
    </nav>
  )
}

export default HistoryButtons
