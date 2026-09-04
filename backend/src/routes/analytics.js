import { Router } from 'express'
import {
  dashboard,
  costPerWear,
  wearFrequency,
  sleepingItems,
  utilization,
  triggerDecay,
} from '../controllers/analyticsController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.get('/dashboard',       dashboard)
router.get('/cost-per-wear',   costPerWear)
router.get('/wear-frequency',  wearFrequency)
router.get('/sleeping-items',  sleepingItems)
router.get('/utilization',     utilization)

// Decay — manual trigger (call this weekly via cron or test manually)
router.post('/decay', triggerDecay)

export default router