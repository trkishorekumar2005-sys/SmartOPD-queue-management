const { getOverview, getDepartmentStats, getPeakHours } = require('../services/statsService')
const { parseIdParam } = require('../utils/validation')

async function overview(req, res, next) {
  try {
    res.json(await getOverview())
  } catch (error) {
    next(error)
  }
}

async function departments(req, res, next) {
  try {
    res.json(await getDepartmentStats())
  } catch (error) {
    next(error)
  }
}

async function peakHours(req, res, next) {
  try {
    let departmentId = null

    if (req.query.departmentId !== undefined) {
      departmentId = parseIdParam(req.query.departmentId)
      if (departmentId === null) {
        return res.status(400).json({ success: false, message: 'departmentId must be a valid number.' })
      }
    }

    res.json(await getPeakHours(departmentId))
  } catch (error) {
    next(error)
  }
}

module.exports = { overview, departments, peakHours }
