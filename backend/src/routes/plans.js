import { Router } from 'express'
import {
  createPlan,
  getWeekPlan,
  getPlans,
  updatePlanStatus,
  deletePlan,
} from '../controllers/planController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.get('/week', getWeekPlan)

router.post('/',    createPlan)
router.get('/',     getPlans)

router.patch('/:planId/status', updatePlanStatus)
router.delete('/:planId',       deletePlan)

export default router