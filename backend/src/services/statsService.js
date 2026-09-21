const { pool } = require('../config/db')

// Same data-quality window as waitTimeService: visits under 1 or over 120 minutes are ignored
// when averaging service time.
const validServiceMinutes = 'TIMESTAMPDIFF(SECOND, called_at, completed_at) BETWEEN 60 AND 7200'

function round(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10
}

// Overall counts across the hospital. Every figure comes straight from MySQL.
async function getOverview() {
  const [[counts]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM patients) AS total_patients,
       COUNT(*) AS total_tokens,
       COALESCE(SUM(status = 'COMPLETED'), 0) AS completed,
       COALESCE(SUM(status = 'WAITING'), 0) AS waiting,
       COALESCE(SUM(status = 'SERVING'), 0) AS serving,
       COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled
     FROM tokens`,
  )

  const [[waiting]] = await pool.execute(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, called_at)) / 60 AS average_wait_minutes
     FROM tokens WHERE called_at IS NOT NULL`,
  )

  const [[service]] = await pool.execute(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, called_at, completed_at)) / 60 AS average_service_minutes
     FROM tokens
     WHERE status = 'COMPLETED' AND called_at IS NOT NULL AND completed_at IS NOT NULL
       AND ${validServiceMinutes}`,
  )

  return {
    totalPatients: Number(counts.total_patients),
    totalTokens: Number(counts.total_tokens),
    completed: Number(counts.completed),
    waiting: Number(counts.waiting),
    serving: Number(counts.serving),
    cancelled: Number(counts.cancelled),
    averageWaitMinutes: round(waiting.average_wait_minutes),
    averageServiceMinutes: round(service.average_service_minutes),
  }
}

async function getDepartmentStats() {
  const [departments] = await pool.execute(
    `SELECT d.id, d.name, d.code, d.average_service_minutes AS configured_service_minutes,
            COUNT(t.id) AS total,
            COALESCE(SUM(t.status = 'COMPLETED'), 0) AS completed,
            COALESCE(SUM(t.status = 'WAITING'), 0) AS waiting,
            COALESCE(SUM(t.status = 'SERVING'), 0) AS serving,
            COALESCE(SUM(t.status = 'CANCELLED'), 0) AS cancelled,
            AVG(CASE WHEN t.called_at IS NOT NULL
                     THEN TIMESTAMPDIFF(SECOND, t.created_at, t.called_at) END) / 60 AS average_wait_minutes,
            (SELECT COUNT(*) FROM doctors WHERE doctors.department_id = d.id AND doctors.is_active = TRUE)
              AS active_doctors
     FROM departments d
     LEFT JOIN tokens t ON t.department_id = d.id
     GROUP BY d.id, d.name, d.code, d.average_service_minutes
     ORDER BY d.name`,
  )

  const [services] = await pool.execute(
    `SELECT department_id, AVG(TIMESTAMPDIFF(SECOND, called_at, completed_at)) / 60 AS average_service_minutes
     FROM tokens
     WHERE status = 'COMPLETED' AND called_at IS NOT NULL AND completed_at IS NOT NULL
       AND ${validServiceMinutes}
     GROUP BY department_id`,
  )
  const serviceByDepartment = new Map(services.map((row) => [row.department_id, row.average_service_minutes]))

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    total: Number(department.total),
    completed: Number(department.completed),
    waiting: Number(department.waiting),
    serving: Number(department.serving),
    cancelled: Number(department.cancelled),
    activeDoctors: Number(department.active_doctors),
    averageWaitMinutes: round(department.average_wait_minutes),
    averageServiceMinutes: round(serviceByDepartment.get(department.id)),
    configuredServiceMinutes: department.configured_service_minutes,
  }))
}

function formatHour(hour) {
  const twelve = (value) => value % 12 || 12
  const suffix = (value) => (value % 24 < 12 ? 'AM' : 'PM')
  const start = `${twelve(hour)}`
  const end = `${twelve(hour + 1)}`

  return suffix(hour) === suffix(hour + 1)
    ? `${start}–${end} ${suffix(hour)}`
    : `${start} ${suffix(hour)}–${end} ${suffix(hour + 1)}`
}

// Historical, descriptive only: how many tokens were issued in each hour of the day.
async function getPeakHours(departmentId) {
  const [rows] = await pool.execute(
    `SELECT HOUR(created_at) AS hour, COUNT(*) AS patients
     FROM tokens
     ${departmentId ? 'WHERE department_id = ?' : ''}
     GROUP BY HOUR(created_at)`,
    departmentId ? [departmentId] : [],
  )

  const countByHour = new Map(rows.map((row) => [row.hour, Number(row.patients)]))
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    patients: countByHour.get(hour) || 0,
  }))

  const busiest = hours.reduce((best, entry) => (entry.patients > best.patients ? entry : best), hours[0])

  return {
    basis: 'Tokens issued per hour of the day, all recorded history (descriptive only, not a forecast).',
    departmentId: departmentId || null,
    peak: busiest.patients > 0 ? busiest : null,
    hours,
  }
}

module.exports = { getOverview, getDepartmentStats, getPeakHours }
