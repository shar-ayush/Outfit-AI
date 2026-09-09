import { removeBackground } from '@imgly/background-removal-node'
import cloudinary from '../config/cloudinary.js'
import ApiError from '../utils/ApiError.js'
import { Readable } from 'stream'

export async function removeImageBackground(imageBuffer, mimeType = 'image/jpeg') {
  try {
    const blob = new Blob([imageBuffer], { type: mimeType })

    const resultBlob = await removeBackground(blob, {
      debug:  false,
      output: {
        format:  'image/png',
        quality: 0.9,
      },
    })

    const arrayBuffer  = await resultBlob.arrayBuffer()
    const resultBuffer = Buffer.from(arrayBuffer)

    return {
      buffer:   resultBuffer,
      mimeType: 'image/png',
    }
  } catch (error) {
    console.error('Background removal failed:', error.message)
    return {
      buffer:   imageBuffer,
      mimeType,
      bgRemoved: false,
    }
  }
}

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
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      ...(publicId && { public_id: publicId }),
    }

    try {
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

      const readable = new Readable()
      readable.push(buffer)
      readable.push(null)
      readable.pipe(uploadStream)
    } catch (err) {
      reject(new ApiError(500, `Cloudinary upload error: ${err.message || err}`))
    }
  })
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${publicId}`, error.message)
  }
}

export async function processAndUploadImage(imageBuffer, mimeType, userId) {
  const { buffer: processedBuffer, mimeType: processedMimeType } =
    await removeImageBackground(imageBuffer, mimeType)

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