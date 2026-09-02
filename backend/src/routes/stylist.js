import { Router } from 'express'
import {
  chat,
  getSession,
  getSessions,
  clearSessionHandler,
} from '../controllers/stylistController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

// Chat
router.post('/chat', chat)

// Sessions
router.get('/sessions',              getSessions)
router.get('/sessions/:sessionId',   getSession)
router.delete('/sessions/:sessionId', clearSessionHandler)

export default router