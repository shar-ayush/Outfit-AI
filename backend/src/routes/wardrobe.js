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

// All wardrobe routes are protected
router.use(auth)

// Stats — before /:clothId to avoid route conflict
router.get('/stats', getStats)

// Upload
router.post('/upload',      uploadSingle,   uploadCloth)
router.post('/upload/bulk', uploadMultiple, bulkUploadClothes)

// Wardrobe CRUD
router.get('/',           getWardrobeItems)
router.get('/:clothId',   getClothItem)
router.patch('/:clothId', updateClothItem)

// Availability toggle
router.patch('/:clothId/availability', toggleClothAvailability)

// Delete
router.delete('/:clothId',           archiveClothItem)
router.delete('/:clothId/permanent', permanentDeleteCloth)

export default router