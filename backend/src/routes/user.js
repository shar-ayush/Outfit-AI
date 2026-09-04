import { Router } from 'express'
import {
  getProfile,
  updateProfile,
  completeOnboarding,
  changePassword,
  getPreferences,
  deleteAccount,
} from '../controllers/userController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.get('/profile',           getProfile)
router.patch('/profile',         updateProfile)
router.post('/onboarding',       completeOnboarding)
router.post('/change-password',  changePassword)
router.get('/preferences',       getPreferences)
router.delete('/account',        deleteAccount)

export default router