import axios from 'axios';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function sendMessageToGemini(message: string): Promise<string> {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: message }]
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  // Gemini's response structure:
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
} 