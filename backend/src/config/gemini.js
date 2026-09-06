import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

// For text generation (outfit reasoning, intent extraction, stylist chat)
export const getGenerativeModel = () =>
  getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.7 },
  })

// For JSON-only responses (structured extraction)
export const getStructuredModel = () =>
  getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })

// For embedding generation
export const getEmbeddingModel = () =>
  getGenAI().getGenerativeModel({ model: 'gemini-embedding-001' })

export default getGenAI