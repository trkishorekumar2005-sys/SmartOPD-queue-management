// Waiting-time estimate (kept deliberately simple so it can be explained to patients):
//
//   estimated wait = ceil(people ahead / active doctors) x average service minutes
//
// - people ahead: WAITING tokens in front of the patient in the same department
// - active doctors: doctors in the department with is_active = TRUE (at least 1 is assumed)
// - average service minutes: the recent historical average (called -> completed) when enough
//   good data exists, otherwise the department's configured average_service_minutes

const MIN_SAMPLES = 5 // completed visits needed before history replaces the configured value
const SAMPLE_SIZE = 50 // most recent completed visits used for the average
const MIN_VISIT_MINUTES = 1 // shorter "visits" are treated as accidental clicks, not real consultations
const MAX_VISIT_MINUTES = 120 // longer ones are treated as a token that was left open

async function getServiceStats(executor, department) {
  const [[history]] = await executor.execute(
    `SELECT AVG(minutes) AS average_minutes, COUNT(*) AS sample_size
     FROM (
       SELECT TIMESTAMPDIFF(SECOND, called_at, completed_at) / 60 AS minutes
       FROM tokens
       WHERE department_id = ? AND status = 'COMPLETED'
         AND called_at IS NOT NULL AND completed_at IS NOT NULL
       ORDER BY completed_at DESC, id DESC
       LIMIT ${SAMPLE_SIZE}
     ) AS recent
     WHERE minutes >= ${MIN_VISIT_MINUTES} AND minutes <= ${MAX_VISIT_MINUTES}`,
    [department.id],
  )

  const [[doctors]] = await executor.execute(
    'SELECT COUNT(*) AS active_doctors FROM doctors WHERE department_id = ? AND is_active = TRUE',
    [department.id],
  )

  const sampleSize = Number(history.sample_size)
  const hasHistory = sampleSize >= MIN_SAMPLES

  return {
    averageServiceMinutes: hasHistory
      ? Math.max(1, Math.round(Number(history.average_minutes)))
      : department.average_service_minutes,
    source: hasHistory ? 'HISTORICAL' : 'CONFIGURED',
    sampleSize,
    activeDoctors: Math.max(1, Number(doctors.active_doctors)),
    formula: 'ceil(people ahead / active doctors) x average service minutes',
  }
}

function estimateWaitMinutes(peopleAhead, { averageServiceMinutes, activeDoctors }) {
  return Math.ceil(peopleAhead / activeDoctors) * averageServiceMinutes
}

module.exports = { getServiceStats, estimateWaitMinutes, MIN_SAMPLES }
