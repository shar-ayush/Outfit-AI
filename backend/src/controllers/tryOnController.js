import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  executeVirtualTryOn,
  getTryOnHistory,
  deleteTryOnResult,
} from '../services/tryOnService.js'

export const tryOn = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const personFile = req.files?.personImage?.[0]
  const apparelFile = req.files?.apparelImage?.[0]

  const { clothId, personUrl, apparelUrl, prompt } = req.body

  if (!personFile && !personUrl) {
    throw new ApiError(400, 'Please provide a person photo (file or URL)')
  }

  if (!apparelFile && !apparelUrl && !clothId) {
    throw new ApiError(400, 'Please provide an apparel photo or select a wardrobe item')
  }

  const result = await executeVirtualTryOn({
    userId,
    personBuffer: personFile?.buffer,
    personMimeType: personFile?.mimetype,
    personUrl,
    apparelBuffer: apparelFile?.buffer,
    apparelMimeType: apparelFile?.mimetype,
    apparelUrl,
    clothId,
    prompt,
  })

  res.status(200).json(new ApiResponse(200, result, 'Virtual try-on completed successfully'))
})

export const getHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { page = 1, limit = 20 } = req.query

  const history = await getTryOnHistory(userId, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  })

  res.status(200).json(new ApiResponse(200, history, 'Try-on history retrieved successfully'))
})

export const deleteTryOn = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { id } = req.params

  await deleteTryOnResult(userId, id)

  res.status(200).json(new ApiResponse(200, null, 'Try-on result deleted successfully'))
})
