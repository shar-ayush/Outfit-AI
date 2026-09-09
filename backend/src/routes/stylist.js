import { Router } from 'express'
import {
  chat,
  getSession,
  getSessions,
  clearSessionHandler,
  clearAllSessionsHandler
} from '../controllers/stylistController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.post('/chat', chat)

router.get('/sessions',              getSessions)
router.get('/sessions/:sessionId',   getSession)
router.delete('/sessions', clearAllSessionsHandler)
router.delete('/sessions/:sessionId', clearSessionHandler)

export default router