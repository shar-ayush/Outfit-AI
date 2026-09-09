import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  uploadSingleCloth,
  uploadBulkClothes,
  getWardrobe,
  getClothById,
  updateCloth,
  archiveCloth,
  deleteCloth,
  toggleAvailability,
  getWardrobeStats,
} from '../services/wardrobeService.js'

export const uploadCloth = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Image file is required')
  }

  const extraData = {
    purchasePrice:    req.body.purchasePrice
      ? parseFloat(req.body.purchasePrice)
      : undefined,
    purchaseCurrency: req.body.purchaseCurrency,
    purchaseDate:     req.body.purchaseDate
      ? new Date(req.body.purchaseDate)
      : undefined,
    brand:            req.body.brand,
    name:             req.body.name,
    notes:            req.body.notes,
  }

  const cloth = await uploadSingleCloth(
    req.user._id,
    req.file.buffer,
    req.file.mimetype,
    extraData
  )

  return res.status(201).json(
    new ApiResponse(201, { cloth }, 'Clothing item uploaded successfully')
  )
})

export const bulkUploadClothes = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'At least one image is required')
  }

  const results = await uploadBulkClothes(req.user._id, req.files)

  return res.status(201).json(
    new ApiResponse(201, {
      uploaded: results.success.length,
      failed:   results.failed.length,
      items:    results.success,
      errors:   results.failed,
    }, `${results.success.length} items uploaded successfully`)
  )
})

export const getWardrobeItems = asyncHandler(async (req, res) => {
  const result = await getWardrobe(req.user._id, req.query)

  return res.json(
    new ApiResponse(200, result, 'Wardrobe fetched')
  )
})

export const getClothItem = asyncHandler(async (req, res) => {
  const cloth = await getClothById(req.params.clothId, req.user._id)

  return res.json(
    new ApiResponse(200, { cloth }, 'Item fetched')
  )
})

export const updateClothItem = asyncHandler(async (req, res) => {
  const cloth = await updateCloth(
    req.params.clothId,
    req.user._id,
    req.body
  )

  return res.json(
    new ApiResponse(200, { cloth }, 'Item updated')
  )
})

export const archiveClothItem = asyncHandler(async (req, res) => {
  await archiveCloth(req.params.clothId, req.user._id)

  return res.json(
    new ApiResponse(200, {}, 'Item archived')
  )
})

export const permanentDeleteCloth = asyncHandler(async (req, res) => {
  const result = await deleteCloth(req.params.clothId, req.user._id)

  return res.json(
    new ApiResponse(200, result, 'Item permanently deleted')
  )
})

export const toggleClothAvailability = asyncHandler(async (req, res) => {
  const result = await toggleAvailability(req.params.clothId, req.user._id)

  return res.json(
    new ApiResponse(200, result, `Item marked as ${result.isAvailable ? 'available' : 'unavailable'}`)
  )
})

export const getStats = asyncHandler(async (req, res) => {
  const stats = await getWardrobeStats(req.user._id)

  return res.json(
    new ApiResponse(200, { stats }, 'Stats fetched')
  )
})