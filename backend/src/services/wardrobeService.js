import Cloth from '../models/Cloth.js'
import ItemPreference from '../models/ItemPreference.js'
import { processAndUploadImage, deleteFromCloudinary } from './imageService.js'
import { extractClothingMetadata, extractBatchMetadata } from './ai/geminiService.js'
import { generateAndStoreClothEmbedding } from './ai/embeddingService.js'
import ApiError from '../utils/ApiError.js'
import mongoose from 'mongoose'

// ─────────────────────────────────────────────
// Upload and process a single clothing item
// Full pipeline:
// image → background removal → cloudinary
//       → gemini metadata extraction
//       → embedding generation
//       → save to DB
// ─────────────────────────────────────────────

export async function uploadSingleCloth(userId, imageBuffer, mimeType, extraData = {}) {
  // Step 1 — process image and upload to Cloudinary
  const { imageUrl, publicId, originalImageUrl, originalPublicId } =
    await processAndUploadImage(imageBuffer, mimeType, userId)

  // Step 2 — extract metadata from ORIGINAL buffer
  // (background-removed image may confuse Gemini for some items)
  const metadata = await extractClothingMetadata(imageBuffer, mimeType)

  // Step 3 — create cloth document
  const cloth = await Cloth.create({
    userId,
    imageUrl,
    publicId,
    originalImageUrl,
    category:           metadata.category,
    subCategory:        metadata.subCategory,
    color: {
      primary:     metadata.color?.primary,
      secondary:   metadata.color?.secondary || [],
      colorFamily: metadata.color?.colorFamily,
    },
    pattern:            metadata.pattern,
    fabric:             metadata.fabric,
    fit:                metadata.fit,
    style:              metadata.style || [],
    formality:          metadata.formality || 'casual',
    season:             metadata.season || [],
    occasions:          metadata.occasions || [],
    weatherSuitability: metadata.weatherSuitability || [],
    temperatureRange: {
      min: metadata.temperatureRange?.min,
      max: metadata.temperatureRange?.max,
    },
    aiTagged:     true,
    aiConfidence: metadata.aiConfidence || 0.8,
    embeddingText: metadata.embeddingText,

    // User-provided extra data (price, brand, name etc.)
    purchasePrice:    extraData.purchasePrice    || null,
    purchaseCurrency: extraData.purchaseCurrency || 'INR',
    purchaseDate:     extraData.purchaseDate     || null,
    brand:            extraData.brand            || null,
    name:             extraData.name             || null,
    notes:            extraData.notes            || null,
  })

  // Step 4 — generate and store embedding (non-blocking)
  // Don't await — let it happen in background
  // Item is fully usable without embedding (filter retrieval still works)
  generateAndStoreClothEmbedding(cloth._id, metadata.embeddingText)
    .catch(err => console.error('Embedding error (non-fatal):', err.message))

  // Step 5 — initialise item preference record
  // Starts at neutral 0.5 — updated as user interacts
  ItemPreference.create({
    userId,
    clothId:    cloth._id,
    score:      0.5,
    confidence: 0.0,
  }).catch(err => console.error('ItemPreference init error:', err.message))

  return cloth
}

// ─────────────────────────────────────────────
// Bulk upload — processes multiple images
// Batches Gemini calls (5 images per call)
// to stay within API limits
// ─────────────────────────────────────────────

export async function uploadBulkClothes(userId, imageFiles) {
  if (!imageFiles || imageFiles.length === 0) {
    throw new ApiError(400, 'No images provided')
  }

  const BATCH_SIZE = 5
  const results    = { success: [], failed: [] }

  // Process images in batches of 5
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE)

    // Step 1 — remove backgrounds and upload to Cloudinary in parallel
    const uploadResults = await Promise.allSettled(
      batch.map(file =>
        processAndUploadImage(file.buffer, file.mimetype, userId)
      )
    )

    // Separate successful uploads
    const successfulUploads = []
    for (let j = 0; j < uploadResults.length; j++) {
      if (uploadResults[j].status === 'fulfilled') {
        successfulUploads.push({
          file:   batch[j],
          upload: uploadResults[j].value,
        })
      } else {
        results.failed.push({
          index: i + j,
          error: uploadResults[j].reason?.message || 'Upload failed',
        })
      }
    }

    if (successfulUploads.length === 0) continue

    // Step 2 — batch metadata extraction
    // One Gemini call for all images in this batch
    let metadataArray = []
    try {
      metadataArray = await extractBatchMetadata(
        successfulUploads.map(s => ({
          buffer:   s.file.buffer,
          mimeType: s.file.mimetype,
        }))
      )
    } catch (error) {
      // Batch extraction failed — skip this batch
      for (let j = 0; j < successfulUploads.length; j++) {
        results.failed.push({
          index: i + j,
          error: `Metadata extraction failed: ${error.message}`,
        })
      }
      continue
    }

    // Step 3 — create cloth documents for successful extractions
    const clothDocs = await Promise.allSettled(
      successfulUploads.map(async ({ file, upload }, j) => {
        const metadata = metadataArray[j]
        if (!metadata) throw new Error('No metadata returned for this image')

        const cloth = await Cloth.create({
          userId,
          imageUrl:         upload.imageUrl,
          publicId:         upload.publicId,
          originalImageUrl: upload.originalImageUrl,
          category:         metadata.category,
          subCategory:      metadata.subCategory,
          color: {
            primary:     metadata.color?.primary,
            secondary:   metadata.color?.secondary || [],
            colorFamily: metadata.color?.colorFamily,
          },
          pattern:            metadata.pattern,
          fabric:             metadata.fabric,
          fit:                metadata.fit,
          style:              metadata.style || [],
          formality:          metadata.formality || 'casual',
          season:             metadata.season || [],
          occasions:          metadata.occasions || [],
          weatherSuitability: metadata.weatherSuitability || [],
          temperatureRange: {
            min: metadata.temperatureRange?.min,
            max: metadata.temperatureRange?.max,
          },
          aiTagged:     true,
          aiConfidence: metadata.aiConfidence || 0.8,
          embeddingText: metadata.embeddingText,
        })

        // Fire-and-forget embedding + preference init
        generateAndStoreClothEmbedding(cloth._id, metadata.embeddingText)
          .catch(err => console.error('Embedding error:', err.message))

        ItemPreference.create({
          userId,
          clothId:    cloth._id,
          score:      0.5,
          confidence: 0.0,
        }).catch(err => console.error('Pref init error:', err.message))

        return cloth
      })
    )

    // Collect results
    clothDocs.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        results.success.push(result.value)
      } else {
        results.failed.push({
          index: i + j,
          error: result.reason?.message || 'Failed to save item',
        })
      }
    })
  }

  return results
}

// ─────────────────────────────────────────────
// Get user's wardrobe with filters and pagination
// ─────────────────────────────────────────────

export async function getWardrobe(userId, query = {}) {
  const {
    category,
    formality,
    occasion,
    season,
    search,
    page     = 1,
    limit    = 20,
    sortBy   = 'createdAt',
    sortOrder = 'desc',
  } = query

  const filter = {
    userId,
    isArchived: false,
  }

  if (category)  filter.category  = category
  if (formality) filter.formality = formality
  if (occasion)  filter.occasions = { $in: [occasion] }
  if (season)    filter.season    = { $in: [season] }

  // Text search on name, brand, notes, subCategory
  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { brand:       { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
      { 'color.primary': { $regex: search, $options: 'i' } },
    ]
  }

  const skip      = (parseInt(page) - 1) * parseInt(limit)
  const sortField = sortBy === 'mostWorn' ? 'wearCount' : sortBy
  const sort      = { [sortField]: sortOrder === 'asc' ? 1 : -1 }

  const [clothes, total] = await Promise.all([
    Cloth.find(filter)
         .select('-embedding')  // never return embedding vector
         .sort(sort)
         .skip(skip)
         .limit(parseInt(limit))
         .lean(),
    Cloth.countDocuments(filter),
  ])

  return {
    clothes,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext:    skip + clothes.length < total,
    },
  }
}

// ─────────────────────────────────────────────
// Get single clothing item with preference data
// ─────────────────────────────────────────────

export async function getClothById(clothId, userId) {
  const cloth = await Cloth.findOne({
    _id:    clothId,
    userId,
    isArchived: false,
  })
    .select('-embedding')
    .lean()

  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  // Attach preference data if exists
  const preference = await ItemPreference.findOne({
    userId,
    clothId,
  }).lean()

  return {
    ...cloth,
    preference: preference
      ? {
          score:      preference.score,
          confidence: preference.confidence,
          wornCount:  preference.signals.worn,
          lastWornAt: preference.lastWornAt,
        }
      : null,
  }
}

// ─────────────────────────────────────────────
// Update clothing item metadata
// ─────────────────────────────────────────────

export async function updateCloth(clothId, userId, updateData) {
  const cloth = await Cloth.findOne({ _id: clothId, userId })
  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  const allowedFields = [
    'name', 'notes', 'brand',
    'purchasePrice', 'purchaseCurrency', 'purchaseDate',
    'occasions', 'season', 'weatherSuitability',
    'formality', 'style', 'isAvailable',
  ]

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      cloth[field] = updateData[field]
    }
  }

  await cloth.save()

  // If embeddingText-relevant fields changed, regenerate embedding
  const embeddingFields = ['occasions', 'season', 'formality', 'style']
  const needsReembedding = embeddingFields.some(f => updateData[f] !== undefined)

  if (needsReembedding && cloth.embeddingText) {
    generateAndStoreClothEmbedding(cloth._id, cloth.embeddingText)
      .catch(err => console.error('Re-embedding error:', err.message))
  }

  return cloth
}

// ─────────────────────────────────────────────
// Soft delete — archive instead of hard delete
// ─────────────────────────────────────────────

export async function archiveCloth(clothId, userId) {
  const cloth = await Cloth.findOneAndUpdate(
    { _id: clothId, userId },
    { isArchived: true, isAvailable: false },
    { new: true }
  )

  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  return cloth
}

// ─────────────────────────────────────────────
// Hard delete — removes from DB and Cloudinary
// Use only when user explicitly wants permanent deletion
// ─────────────────────────────────────────────

export async function deleteCloth(clothId, userId) {
  const cloth = await Cloth.findOne({ _id: clothId, userId })
  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  // Delete images from Cloudinary
  await Promise.all([
    deleteFromCloudinary(cloth.publicId),
    cloth.originalPublicId
      ? deleteFromCloudinary(cloth.originalPublicId)
      : Promise.resolve(),
  ])

  // Delete cloth and its preference data
  await Promise.all([
    Cloth.findByIdAndDelete(clothId),
    ItemPreference.deleteMany({ clothId }),
  ])

  return { deleted: true, clothId }
}

// ─────────────────────────────────────────────
// Toggle availability (in laundry, loaned out etc.)
// ─────────────────────────────────────────────

export async function toggleAvailability(clothId, userId) {
  const cloth = await Cloth.findOne({ _id: clothId, userId })
  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  cloth.isAvailable = !cloth.isAvailable
  await cloth.save()

  return {
    clothId,
    isAvailable: cloth.isAvailable,
  }
}

// ─────────────────────────────────────────────
// Get wardrobe stats — used for analytics
// ─────────────────────────────────────────────

export async function getWardrobeStats(userId) {
  const uid = new mongoose.Types.ObjectId(userId)

  const [categoryStats, totalValue, totalItems] = await Promise.all([
    // Item count per category
    Cloth.aggregate([
      { $match: { userId: uid, isArchived: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Total wardrobe value
    Cloth.aggregate([
      {
        $match: {
          userId:        uid,
          isArchived:    false,
          purchasePrice: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: null, total: { $sum: '$purchasePrice' } } },
    ]),

    // Total items
    Cloth.countDocuments({ userId: uid, isArchived: false }),
  ])

  return {
    totalItems,
    totalWardrobeValue: totalValue[0]?.total || 0,
    byCategory: categoryStats.reduce((acc, s) => {
      acc[s._id] = s.count
      return acc
    }, {}),
  }
}