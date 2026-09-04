import { Router } from 'express'
import {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
} from '../controllers/authController.js'
import auth from '../middleware/auth.js'

const router = Router()

// Public routes
router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refreshToken)

// Protected routes
router.post('/logout',     auth, logout)
router.post('/logout-all', auth, logoutAll)
router.get('/me',          auth, getMe)

export default router