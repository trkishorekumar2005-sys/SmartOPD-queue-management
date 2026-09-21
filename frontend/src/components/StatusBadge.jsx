// Colour-coded token status (WAITING / SERVING / COMPLETED / CANCELLED).
function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
}

export default StatusBadge
