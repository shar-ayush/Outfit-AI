import multer from 'multer'
import ApiError from '../utils/ApiError.js'

// Use memory storage — we process the buffer before uploading to Cloudinary
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG and WebP images are allowed'), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// Single image upload
export const uploadSingle = upload.single('image')

// Multiple images — up to 20 for bulk upload
export const uploadMultiple = upload.array('images', 20)