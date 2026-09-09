import Cloth from '../models/Cloth.js'
import ItemPreference from '../models/ItemPreference.js'
import { processAndUploadImage, deleteFromCloudinary } from './imageService.js'
import { extractClothingMetadata, extractBatchMetadata } from './ai/geminiService.js'
import { generateAndStoreClothEmbedding } from './ai/embeddingService.js'
import ApiError from '../utils/ApiError.js'
import mongoose from 'mongoose'

export async function uploadSingleCloth(userId, imageBuffer, mimeType, extraData = {}) {
  const { imageUrl, publicId, originalImageUrl, originalPublicId } =
    await processAndUploadImage(imageBuffer, mimeType, userId)

  const metadata = await extractClothingMetadata(imageBuffer, mimeType)

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
      hex:         metadata.color?.hex || null,
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

    purchasePrice:    extraData.purchasePrice    || null,
    purchaseCurrency: extraData.purchaseCurrency || 'INR',
    purchaseDate:     extraData.purchaseDate     || null,
    brand:            extraData.brand            || null,
    name:             extraData.name             || null,
    notes:            extraData.notes            || null,
  })

  generateAndStoreClothEmbedding(cloth._id, metadata.embeddingText)
    .catch(err => console.error('Embedding error (non-fatal):', err.message))

  ItemPreference.create({
    userId,
    clothId:    cloth._id,
    score:      0.5,
    confidence: 0.0,
  }).catch(err => console.error('ItemPreference init error:', err.message))

  return cloth
}

export async function uploadBulkClothes(userId, imageFiles) {
  if (!imageFiles || imageFiles.length === 0) {
    throw new ApiError(400, 'No images provided')
  }

  const BATCH_SIZE = 5
  const results    = { success: [], failed: [] }

  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE)

    const uploadResults = await Promise.allSettled(
      batch.map(file =>
        processAndUploadImage(file.buffer, file.mimetype, userId)
      )
    )

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

    let metadataArray = []
    try {
      metadataArray = await extractBatchMetadata(
        successfulUploads.map(s => ({
          buffer:   s.file.buffer,
          mimeType: s.file.mimetype,
        }))
      )
    } catch (error) {
      for (let j = 0; j < successfulUploads.length; j++) {
        results.failed.push({
          index: i + j,
          error: `Metadata extraction failed: ${error.message}`,
        })
      }
      continue
    }

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
            hex:         metadata.color?.hex || null,
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

    clothDocs.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        const item = result.value?.toObject ? result.value.toObject() : result.value
        results.success.push(item)
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
         .select('-embedding')
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

export async function getClothById(clothId, userId) {
  const cloth = await Cloth.findOne({
    _id:    clothId,
    userId,
    isArchived: false,
  })
    .select('-embedding')
    .lean()

  if (!cloth) throw new ApiError(404, 'Clothing item not found')

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

  const embeddingFields = ['occasions', 'season', 'formality', 'style']
  const needsReembedding = embeddingFields.some(f => updateData[f] !== undefined)

  if (needsReembedding && cloth.embeddingText) {
    generateAndStoreClothEmbedding(cloth._id, cloth.embeddingText)
      .catch(err => console.error('Re-embedding error:', err.message))
  }

  return cloth
}

export async function archiveCloth(clothId, userId) {
  const cloth = await Cloth.findOneAndUpdate(
    { _id: clothId, userId },
    { isArchived: true, isAvailable: false },
    { new: true }
  )

  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  return cloth
}

export async function deleteCloth(clothId, userId) {
  const cloth = await Cloth.findOne({ _id: clothId, userId })
  if (!cloth) throw new ApiError(404, 'Clothing item not found')

  await Promise.all([
    deleteFromCloudinary(cloth.publicId),
    cloth.originalPublicId
      ? deleteFromCloudinary(cloth.originalPublicId)
      : Promise.resolve(),
  ])

  await Promise.all([
    Cloth.findByIdAndDelete(clothId),
    ItemPreference.deleteMany({ clothId }),
  ])

  return { deleted: true, clothId }
}

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

export async function getWardrobeStats(userId) {
  const uid = new mongoose.Types.ObjectId(userId)

  const [categoryStats, totalValue, totalItems] = await Promise.all([
    Cloth.aggregate([
      { $match: { userId: uid, isArchived: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

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