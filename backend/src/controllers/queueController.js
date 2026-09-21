const {
  getQueue,
  callNextToken,
  completeCurrentToken,
  completeAndCallNext,
} = require('../services/queueService')
const { isPositiveInteger, parseIdParam } = require('../utils/validation')

async function getDepartmentQueue(req, res, next) {
  try {
    const departmentId = parseIdParam(req.params.departmentId)
    if (departmentId === null) {
      return res.status(400).json({ success: false, message: 'departmentId must be a valid number.' })
    }

    const queue = await getQueue(departmentId)
    res.json(queue)
  } catch (error) {
    next(error)
  }
}

// Builds a staff action handler that validates departmentId and runs the given queue service.
function departmentAction(action) {
  return async (req, res, next) => {
    try {
      const { departmentId } = req.body
      if (!isPositiveInteger(departmentId)) {
        return res.status(400).json({ success: false, message: 'departmentId must be a valid number.' })
      }

      res.json(await action(departmentId))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = {
  getDepartmentQueue,
  callNext: departmentAction(callNextToken),
  complete: departmentAction(completeCurrentToken),
  completeAndCallNext: departmentAction(completeAndCallNext),
}
