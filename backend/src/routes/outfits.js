import { Router } from 'express'
import {
  suggestOutfits,
  outfitAction,
  getSaved,
  getOutfit,
  removeOutfit,
  getOutfitRecommendation
} from '../controllers/outfitController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

// Suggest — main recommendation endpoint
router.post('/suggest', suggestOutfits)

// Saved outfits — before /:outfitId to avoid conflict
router.get('/saved', getSaved)

// Single outfit
router.get('/:outfitId',         getOutfit)
router.delete('/:outfitId',      removeOutfit)

// Record action on outfit
router.post('/:outfitId/action', outfitAction)

router.get('/:outfitId/recommendation', getOutfitRecommendation)


export default router