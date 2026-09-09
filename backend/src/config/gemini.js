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

export const getGenerativeModel = () =>
  getGenAI().getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    generationConfig: { temperature: 0.7 },
  })

export const getStructuredModel = () =>
  getGenAI().getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })

export const getEmbeddingModel = () =>
  getGenAI().getGenerativeModel({ model: 'gemini-embedding-001' })

export default getGenAI