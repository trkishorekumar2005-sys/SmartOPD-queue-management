const { pool } = require('../config/db')
const { withDepartmentLock } = require('./queueService')
const { getServiceStats, estimateWaitMinutes } = require('./waitTimeService')

async function createToken(patientId, departmentId) {
  const connection = await pool.getConnection()
  const lockName = `smartopd_department_${departmentId}`

  try {
    const [[lock]] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName])

    if (!lock.acquired) {
      throw new Error('The queue is busy. Please try again.')
    }

    await connection.beginTransaction()

    const [[patient]] = await connection.execute('SELECT id FROM patients WHERE id = ?', [patientId])
    if (!patient) {
      const error = new Error('Patient not found.')
      error.statusCode = 404
      throw error
    }

    const [[department]] = await connection.execute(
      'SELECT id, name, code FROM departments WHERE id = ?',
      [departmentId],
    )
    if (!department) {
      const error = new Error('Department not found.')
      error.statusCode = 404
      throw error
    }

    const [[latestToken]] = await connection.execute(
      `SELECT token_number FROM tokens
       WHERE department_id = ?
       ORDER BY id DESC
       LIMIT 1 FOR UPDATE`,
      [departmentId],
    )

    const lastNumber = latestToken ? Number(latestToken.token_number.split('-')[1]) : 0
    const tokenNumber = `${department.code}-${String(lastNumber + 1).padStart(2, '0')}`

    const [result] = await connection.execute(
      `INSERT INTO tokens (patient_id, department_id, token_number, status)
       VALUES (?, ?, ?, 'WAITING')`,
      [patientId, departmentId, tokenNumber],
    )

    await connection.commit()

    return {
      id: result.insertId,
      tokenNumber,
      status: 'WAITING',
      department: department.name,
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName])
    connection.release()
  }
}

async function getTokenStatus(tokenId) {
  const [[token]] = await pool.execute(
    `SELECT tokens.id, tokens.token_number, tokens.status, tokens.department_id,
            tokens.called_at, tokens.completed_at, tokens.created_at,
            patients.id AS patient_id, patients.name AS patient_name,
            departments.name AS department_name, departments.code AS department_code,
            departments.average_service_minutes
     FROM tokens
     INNER JOIN patients ON patients.id = tokens.patient_id
     INNER JOIN departments ON departments.id = tokens.department_id
     WHERE tokens.id = ?`,
    [tokenId],
  )

  if (!token) {
    const error = new Error('Token not found.')
    error.statusCode = 404
    throw error
  }

  let queuePosition = null
  if (token.status === 'WAITING') {
    const [waitingTokens] = await pool.execute(
      `SELECT id FROM tokens
       WHERE department_id = ? AND status = 'WAITING'
       ORDER BY created_at ASC, id ASC`,
      [token.department_id],
    )
    queuePosition = waitingTokens.findIndex((waitingToken) => waitingToken.id === token.id) + 1
  }

  const estimate = await getServiceStats(pool, {
    id: token.department_id,
    average_service_minutes: token.average_service_minutes,
  })

  return {
    id: token.id,
    tokenNumber: token.token_number,
    status: token.status,
    patient: { id: token.patient_id, name: token.patient_name },
    department: { id: token.department_id, name: token.department_name, code: token.department_code },
    queuePosition,
    patientsAhead: queuePosition === null ? null : queuePosition - 1,
    averageServiceMinutes: estimate.averageServiceMinutes,
    activeDoctors: estimate.activeDoctors,
    estimateSource: estimate.source,
    // Estimate = ceil(people ahead / active doctors) x average service minutes (see waitTimeService).
    estimatedWaitMinutes: queuePosition === null ? null : estimateWaitMinutes(queuePosition - 1, estimate),
    calledAt: token.called_at,
    completedAt: token.completed_at,
    createdAt: token.created_at,
  }
}

// WAITING -> CANCELLED. Only waiting tokens can be cancelled.
async function cancelToken(tokenId) {
  const [[existingToken]] = await pool.execute('SELECT department_id FROM tokens WHERE id = ?', [tokenId])

  if (!existingToken) {
    const error = new Error('Token not found.')
    error.statusCode = 404
    throw error
  }

  return withDepartmentLock(existingToken.department_id, async (connection) => {
    const [[token]] = await connection.execute(
      'SELECT id, token_number, status FROM tokens WHERE id = ? FOR UPDATE',
      [tokenId],
    )

    if (token.status !== 'WAITING') {
      const error = new Error(`Only waiting tokens can be cancelled. This token is ${token.status}.`)
      error.statusCode = 409
      throw error
    }

    await connection.execute("UPDATE tokens SET status = 'CANCELLED' WHERE id = ?", [tokenId])
    return { id: token.id, tokenNumber: token.token_number, status: 'CANCELLED' }
  })
}

module.exports = { createToken, getTokenStatus, cancelToken }
