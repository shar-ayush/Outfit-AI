import { Router } from 'express'
import {
  tryOn,
  getHistory,
  deleteTryOn,
} from '../controllers/tryOnController.js'
import auth from '../middleware/auth.js'
import { uploadTryOn } from '../middleware/upload.js'

const router = Router()

// All try-on routes require authentication
router.use(auth)

// Execute Virtual Try-On
router.post('/', uploadTryOn, tryOn)

// Get user's try-on history
router.get('/history', getHistory)

// Delete a saved try-on
router.delete('/:id', deleteTryOn)

export default router
