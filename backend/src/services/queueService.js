const { pool } = require('../config/db')
const { getServiceStats, estimateWaitMinutes } = require('./waitTimeService')

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// FIFO: the oldest WAITING token always comes first; id breaks ties within the same second.
const fifoOrder = 'ORDER BY created_at ASC, id ASC'

async function getQueue(departmentId) {
  const [[department]] = await pool.execute(
    'SELECT id, name, code, average_service_minutes FROM departments WHERE id = ?',
    [departmentId],
  )

  if (!department) {
    throw createHttpError('Department not found.', 404)
  }

  const [tokens] = await pool.execute(
    `SELECT tokens.id, tokens.token_number, tokens.status, tokens.called_at, tokens.created_at,
            patients.name AS patient_name
     FROM tokens
     INNER JOIN patients ON patients.id = tokens.patient_id
     WHERE tokens.department_id = ? AND tokens.status IN ('WAITING', 'SERVING')
     ORDER BY CASE WHEN tokens.status = 'SERVING' THEN 0 ELSE 1 END, tokens.created_at, tokens.id`,
    [departmentId],
  )

  // Estimate = ceil(people ahead / active doctors) x average service minutes (see waitTimeService).
  // The token being served is not counted as "ahead".
  const estimate = await getServiceStats(pool, department)
  const waiting = tokens
    .filter((token) => token.status === 'WAITING')
    .map((token, index) => ({
      ...token,
      position: index + 1,
      estimated_wait_minutes: estimateWaitMinutes(index, estimate),
    }))

  return {
    department,
    serving: tokens.find((token) => token.status === 'SERVING') || null,
    waiting,
    waitingCount: waiting.length,
    estimate,
  }
}

// Runs `work` inside a transaction while holding the department's queue lock,
// so concurrent staff actions on the same queue are applied one at a time.
async function withDepartmentLock(departmentId, work) {
  const connection = await pool.getConnection()
  const lockName = `smartopd_department_${departmentId}`
  let hasLock = false

  try {
    const [[lock]] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName])
    if (!lock.acquired) {
      throw createHttpError('The queue is busy. Please try again.', 503)
    }
    hasLock = true

    await connection.beginTransaction()

    const [[department]] = await connection.execute('SELECT id FROM departments WHERE id = ?', [departmentId])
    if (!department) {
      throw createHttpError('Department not found.', 404)
    }

    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    if (hasLock) {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName])
    }
    connection.release()
  }
}

async function findServingToken(connection, departmentId) {
  const [[serving]] = await connection.execute(
    `SELECT id, token_number FROM tokens
     WHERE department_id = ? AND status = 'SERVING'
     ORDER BY id ASC
     LIMIT 1 FOR UPDATE`,
    [departmentId],
  )
  return serving || null
}

async function markServingCompleted(connection, departmentId) {
  const serving = await findServingToken(connection, departmentId)
  if (!serving) return null

  await connection.execute(
    `UPDATE tokens SET status = 'COMPLETED', completed_at = NOW()
     WHERE department_id = ? AND status = 'SERVING'`,
    [departmentId],
  )
  return { id: serving.id, token_number: serving.token_number, status: 'COMPLETED' }
}

async function markOldestWaitingServing(connection, departmentId) {
  const [[nextToken]] = await connection.execute(
    `SELECT id, token_number FROM tokens
     WHERE department_id = ? AND status = 'WAITING'
     ${fifoOrder}
     LIMIT 1 FOR UPDATE`,
    [departmentId],
  )
  if (!nextToken) return null

  await connection.execute(
    `UPDATE tokens SET status = 'SERVING', called_at = NOW() WHERE id = ?`,
    [nextToken.id],
  )
  return { id: nextToken.id, token_number: nextToken.token_number, status: 'SERVING' }
}

// Call the oldest WAITING token. Refuses while another patient is still being served.
function callNextToken(departmentId) {
  return withDepartmentLock(departmentId, async (connection) => {
    if (await findServingToken(connection, departmentId)) {
      throw createHttpError('A patient is already being served. Complete them before calling the next one.', 409)
    }

    const serving = await markOldestWaitingServing(connection, departmentId)
    if (!serving) {
      return { serving: null, message: 'No waiting patients in this queue.' }
    }

    return { serving, message: 'Next patient is now being served.' }
  })
}

// SERVING -> COMPLETED
function completeCurrentToken(departmentId) {
  return withDepartmentLock(departmentId, async (connection) => {
    const completed = await markServingCompleted(connection, departmentId)
    if (!completed) {
      throw createHttpError('No patient is currently being served.', 409)
    }

    return { completed, message: 'Patient marked as completed.' }
  })
}

// Complete the current patient and call the next one in a single transaction.
function completeAndCallNext(departmentId) {
  return withDepartmentLock(departmentId, async (connection) => {
    const completed = await markServingCompleted(connection, departmentId)
    const serving = await markOldestWaitingServing(connection, departmentId)

    let message = 'Completed the current patient and called the next patient.'
    if (!serving) message = completed ? 'Patient completed. No waiting patients in this queue.' : 'No patients in this queue.'
    else if (!completed) message = 'Next patient is now being served.'

    return { completed, serving, message }
  })
}

module.exports = { getQueue, callNextToken, completeCurrentToken, completeAndCallNext, withDepartmentLock }
