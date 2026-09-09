import { Router } from 'express'
import {
  suggestOutfits,
  outfitAction,
  getSaved,
  getOutfit,
  removeOutfit,
  permanentDeleteOutfit,
  getOutfitRecommendation,
  createOutfit,
  getDailyOutfit,
  refreshDailyOutfit,
} from '../controllers/outfitController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.post('/suggest', suggestOutfits)

router.get('/daily', getDailyOutfit)
router.post('/daily/refresh', refreshDailyOutfit)

router.post('/', createOutfit)

router.get('/saved', getSaved)

router.get('/:outfitId',         getOutfit)
router.delete('/:outfitId',           removeOutfit)
router.delete('/:outfitId/permanent', permanentDeleteOutfit)

router.post('/:outfitId/action', outfitAction)

router.get('/:outfitId/recommendation', getOutfitRecommendation)

export default router