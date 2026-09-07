import axios from 'axios'
import { uploadToCloudinary, deleteFromCloudinary } from './imageService.js'
import TryOnResult from '../models/TryOnResult.js'
import Cloth from '../models/Cloth.js'
import ApiError from '../utils/ApiError.js'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '048e4734a4mshab3aef0959242d6p124670jsnd97c9d4cb1d9'
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'virtual-try-on7.p.rapidapi.com'
const TRY_ON_API_URL = 'https://virtual-try-on7.p.rapidapi.com/results'

/**
 * Execute Virtual Try-On using API4AI / RapidAPI
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {Buffer} [params.personBuffer]
 * @param {string} [params.personMimeType]
 * @param {string} [params.personUrl]
 * @param {Buffer} [params.apparelBuffer]
 * @param {string} [params.apparelMimeType]
 * @param {string} [params.apparelUrl]
 * @param {string} [params.clothId]
 * @param {string} [params.prompt]
 */
export async function executeVirtualTryOn({
  userId,
  personBuffer,
  personMimeType = 'image/jpeg',
  personUrl,
  apparelBuffer,
  apparelMimeType = 'image/jpeg',
  apparelUrl,
  clothId,
  prompt,
}) {
  let resolvedPersonUrl = personUrl
  let resolvedApparelUrl = apparelUrl
  let referencedCloth = null

  // 1. Resolve Person Image
  if (personBuffer) {
    const personExt = personMimeType.split('/')[1] || 'jpeg'
    const uploadResult = await uploadToCloudinary(personBuffer, {
      folder: `outfitai/${userId}/try-on-inputs`,
      format: personExt === 'png' ? 'png' : 'jpg',
    })
    resolvedPersonUrl = uploadResult.imageUrl
  }

  if (!resolvedPersonUrl) {
    throw new ApiError(400, 'A person photo is required for virtual try-on')
  }

  // 2. Resolve Apparel Image
  if (clothId) {
    referencedCloth = await Cloth.findOne({ _id: clothId, userId })
    if (!referencedCloth) {
      throw new ApiError(404, 'Selected wardrobe item not found')
    }
    resolvedApparelUrl = referencedCloth.imageUrl
  } else if (apparelBuffer) {
    const apparelExt = apparelMimeType.split('/')[1] || 'jpeg'
    const uploadResult = await uploadToCloudinary(apparelBuffer, {
      folder: `outfitai/${userId}/try-on-inputs`,
      format: apparelExt === 'png' ? 'png' : 'jpg',
    })
    resolvedApparelUrl = uploadResult.imageUrl
  }

  if (!resolvedApparelUrl) {
    throw new ApiError(400, 'An apparel photo or wardrobe item is required for virtual try-on')
  }

  // 3. Call RapidAPI Virtual Try-On
  const payload = new URLSearchParams()
  payload.set('url', resolvedPersonUrl)
  payload.set('url-apparel', resolvedApparelUrl)
  if (prompt && prompt.trim()) {
    payload.set('prompt', prompt.trim())
  }

  let apiResponse
  try {
    apiResponse = await axios.post(TRY_ON_API_URL, payload, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 60000, // Generation may take 15-30s
    })
  } catch (err) {
    const statusCode = err.response?.status || 500
    const errMessage =
      err.response?.data?.message ||
      err.response?.data?.detail ||
      err.message ||
      'Virtual Try-On service error'
    console.error('RapidAPI Try-On error:', statusCode, err.response?.data || err.message)
    throw new ApiError(statusCode >= 400 && statusCode < 500 ? statusCode : 502, `Try-On API failed: ${errMessage}`)
  }

  const resultEntry = apiResponse.data?.results?.[0]
  if (!resultEntry) {
    throw new ApiError(502, 'Invalid response received from Virtual Try-On service')
  }

  if (resultEntry.status?.code === 'failure') {
    throw new ApiError(422, resultEntry.status?.message || 'Could not process images for try-on')
  }

  const generatedEntity = resultEntry.entities?.find(
    (e) => e.kind === 'image' || e.name === 'person-in-apparel'
  ) || resultEntry.entities?.[0]

  if (!generatedEntity || !generatedEntity.image) {
    throw new ApiError(502, 'Generated try-on image not found in service response')
  }

  // 4. Convert Base64 output to Buffer & upload to Cloudinary
  const imageBuffer = Buffer.from(generatedEntity.image, 'base64')
  const uploadResult = await uploadToCloudinary(imageBuffer, {
    folder: `outfitai/${userId}/try-on-results`,
    format: (generatedEntity.format || 'jpg').toLowerCase(),
  })

  // 5. Persist record in MongoDB
  const tryOnRecord = await TryOnResult.create({
    userId,
    clothId: referencedCloth ? referencedCloth._id : null,
    resultImageUrl: uploadResult.imageUrl,
    resultPublicId: uploadResult.publicId,
    personImageUrl: resolvedPersonUrl,
    apparelImageUrl: resolvedApparelUrl,
    prompt: prompt || null,
    status: 'success',
    metadata: {
      width: uploadResult.width || resultEntry.width,
      height: uploadResult.height || resultEntry.height,
      format: generatedEntity.format || 'JPEG',
    },
  })

  if (referencedCloth) {
    tryOnRecord.cloth = referencedCloth
  }

  return tryOnRecord
}

/**
 * Retrieve paginated Try-On history for a user
 */
export async function getTryOnHistory(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const [results, total] = await Promise.all([
    TryOnResult.find({ userId, status: 'success' })
      .populate('clothId', 'name category subCategory imageUrl color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TryOnResult.countDocuments({ userId, status: 'success' }),
  ])

  return {
    results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Delete a Try-On result
 */
export async function deleteTryOnResult(userId, resultId) {
  const record = await TryOnResult.findOne({ _id: resultId, userId })
  if (!record) {
    throw new ApiError(404, 'Try-On result not found')
  }

  if (record.resultPublicId) {
    await deleteFromCloudinary(record.resultPublicId)
  }

  await record.deleteOne()
  return { success: true }
}
