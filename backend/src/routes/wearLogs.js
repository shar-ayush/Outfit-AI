import { Router } from 'express'
import {
  logWear,
  getHistory,
  getWearLog,
  deleteWearLog,
  deleteAllWearLogs
} from '../controllers/wearLogController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.post('/',        logWear)
router.get('/',         getHistory)
router.delete('/', deleteAllWearLogs)
router.get('/:logId',   getWearLog)
router.delete('/:logId', deleteWearLog)

export default router