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

// Week plan — before /:planId to avoid conflict
router.get('/week', getWeekPlan)

// Plans CRUD
router.post('/',    createPlan)
router.get('/',     getPlans)

// Single plan
router.patch('/:planId/status', updatePlanStatus)
router.delete('/:planId',       deletePlan)

export default router