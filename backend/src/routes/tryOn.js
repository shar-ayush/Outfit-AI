import { Router } from 'express'
import {
  tryOn,
  getHistory,
  deleteTryOn,
} from '../controllers/tryOnController.js'
import auth from '../middleware/auth.js'
import { uploadTryOn } from '../middleware/upload.js'

const router = Router()

router.use(auth)

router.post('/', uploadTryOn, tryOn)

router.get('/history', getHistory)

router.delete('/:id', deleteTryOn)

export default router
