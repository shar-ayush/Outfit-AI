import { removeBackground } from '@imgly/background-removal-node'
import cloudinary from '../config/cloudinary.js'
import ApiError from '../utils/ApiError.js'
import { Readable } from 'stream'

// ─────────────────────────────────────────────
// Remove background from image buffer
// Uses @imgly/background-removal-node
// Runs locally — zero API cost, no limits
// Returns a buffer with transparent background
// ─────────────────────────────────────────────

export async function removeImageBackground(imageBuffer, mimeType = 'image/jpeg') {
  try {
    // Convert buffer to Blob (required by the library)
    const blob = new Blob([imageBuffer], { type: mimeType })

    const resultBlob = await removeBackground(blob, {
      debug:  false,
      output: {
        format:  'image/png',  // always PNG for transparency support
        quality: 0.9,
      },
    })

    // Convert result Blob back to Buffer
    const arrayBuffer  = await resultBlob.arrayBuffer()
    const resultBuffer = Buffer.from(arrayBuffer)

    return {
      buffer:   resultBuffer,
      mimeType: 'image/png',
    }
  } catch (error) {
    // Background removal failed — return original image
    // Item is still usable, just with original background
    console.error('Background removal failed:', error.message)
    return {
      buffer:   imageBuffer,
      mimeType,
      bgRemoved: false,
    }
  }
}

// ─────────────────────────────────────────────
// Upload buffer to Cloudinary
// Returns secure URL and public ID
// ─────────────────────────────────────────────

export async function uploadToCloudinary(buffer, options = {}) {
  const {
    folder   = 'outfitai/wardrobe',
    publicId = null,
    format   = 'png',
  } = options

  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(new ApiError(500, 'Cloudinary API credentials missing. Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend .env'))
    }

    const uploadOptions = {
      folder,
      resource_type: 'image',
      format,
      transformation: [
        // Resize to max 1200px on longest side — keeps storage small
        { width: 1200, height: 1200, crop: 'limit' },
        // Auto quality optimization
        { quality: 'auto:good' },
        // Auto format (webp for supported browsers)
        { fetch_format: 'auto' },
      ],
      ...(publicId && { public_id: publicId }),
    }

    try {
      // Upload from stream
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(new ApiError(500, `Cloudinary upload failed: ${error.message || error}`))
            return
          }
          resolve({
            imageUrl:  result.secure_url,
            publicId:  result.public_id,
            width:     result.width,
            height:    result.height,
            format:    result.format,
            bytes:     result.bytes,
          })
        }
      )

      // Pipe buffer into upload stream
      const readable = new Readable()
      readable.push(buffer)
      readable.push(null)
      readable.pipe(uploadStream)
    } catch (err) {
      reject(new ApiError(500, `Cloudinary upload error: ${err.message || err}`))
    }
  })
}

// ─────────────────────────────────────────────
// Delete image from Cloudinary
// Called when clothing item is deleted
// ─────────────────────────────────────────────

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    // Non-fatal — log and continue
    console.error(`Failed to delete from Cloudinary: ${publicId}`, error.message)
  }
}

// ─────────────────────────────────────────────
// Full image processing pipeline
// 1. Remove background
// 2. Upload original to Cloudinary (for reference)
// 3. Upload processed to Cloudinary
// Returns both URLs
// ─────────────────────────────────────────────

export async function processAndUploadImage(imageBuffer, mimeType, userId) {
  // Step 1 — remove background
  const { buffer: processedBuffer, mimeType: processedMimeType } =
    await removeImageBackground(imageBuffer, mimeType)

  // Step 2 — upload both processed and original to Cloudinary
  const [processedResult, originalResult] = await Promise.all([
    uploadToCloudinary(processedBuffer, {
      folder: `outfitai/${userId}/wardrobe`,
      format: 'png',
    }),
    uploadToCloudinary(imageBuffer, {
      folder: `outfitai/${userId}/original`,
      format: mimeType.split('/')[1] || 'jpeg',
    }),
  ])

  return {
    imageUrl:         processedResult.imageUrl,
    publicId:         processedResult.publicId,
    originalImageUrl: originalResult.imageUrl,
    originalPublicId: originalResult.publicId,
  }
}