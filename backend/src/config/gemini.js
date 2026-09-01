import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// For text generation (outfit reasoning, intent extraction, stylist chat)
export const getGenerativeModel = () =>
  genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.7 },
  })

// For JSON-only responses (structured extraction)
export const getStructuredModel = () =>
  genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })

// For embedding generation
export const getEmbeddingModel = () =>
  genAI.getGenerativeModel({ model: 'text-embedding-004' })

export default genAI