import { Router } from 'express'
import {
  uploadCloth,
  bulkUploadClothes,
  getWardrobeItems,
  getClothItem,
  updateClothItem,
  archiveClothItem,
  permanentDeleteCloth,
  toggleClothAvailability,
  getStats,
} from '../controllers/wardrobeController.js'
import auth from '../middleware/auth.js'
import { uploadSingle, uploadMultiple } from '../middleware/upload.js'

const router = Router()

router.use(auth)

router.get('/stats', getStats)

router.post('/upload',      uploadSingle,   uploadCloth)
router.post('/upload/bulk', uploadMultiple, bulkUploadClothes)

router.get('/',           getWardrobeItems)
router.get('/:clothId',   getClothItem)
router.patch('/:clothId', updateClothItem)

router.patch('/:clothId/availability', toggleClothAvailability)

router.delete('/:clothId',           archiveClothItem)
router.delete('/:clothId/permanent', permanentDeleteCloth)

export default router