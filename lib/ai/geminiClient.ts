import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the Gemini Pro model
export function getGeminiModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// Generate text using Gemini
export async function generateText(prompt: string): Promise<string> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw error;
  }
}