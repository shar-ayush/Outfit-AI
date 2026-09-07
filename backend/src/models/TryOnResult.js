import mongoose from 'mongoose'

const tryOnResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clothId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cloth',
      default: null,
    },
    resultImageUrl: {
      type: String,
      required: true,
    },
    resultPublicId: {
      type: String,
      default: null,
    },
    personImageUrl: {
      type: String,
      default: null,
    },
    apparelImageUrl: {
      type: String,
      default: null,
    },
    prompt: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
    metadata: {
      width: Number,
      height: Number,
      format: String,
    },
  },
  { timestamps: true }
)

export default mongoose.model('TryOnResult', tryOnResultSchema)
