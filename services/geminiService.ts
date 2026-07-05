
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY_STORAGE_KEY = 'smart_pdf_tagger_gemini_api_key';

export const loadGeminiApiKey = () => {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const saveGeminiApiKey = (apiKey: string) => {
  localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey.trim());
};

const getConfiguredApiKey = () => {
  const savedKey = loadGeminiApiKey();
  if (savedKey) return savedKey;

  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    }
  } catch {
    console.warn("Could not access process.env");
  }

  return '';
};

/**
 * Analyzes a specific cropped image region to suggest a label or content description.
 * @param base64Image The base64 encoded image string (JPEG/PNG)
 * @returns A suggestion string for the tag
 */
export const analyzeImageRegion = async (base64Image: string): Promise<string> => {
  try {
    const apiKey = getConfiguredApiKey();
    if (!apiKey) {
      throw new Error('Add a Gemini API key in Settings to use AI analysis.');
    }

    // Initialize the client lazily
    const ai = new GoogleGenAI({ apiKey });

    // Clean the base64 string if it contains the data URI prefix
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: "Analyze this image crop from a document. Provide a very short, concise label (max 4 words) that describes what this section contains (e.g., 'Total Amount', 'Vendor Address', 'Chart', 'Signature'). Do not write a full sentence."
          }
        ]
      }
    });

    return response.text?.trim() || "Unknown Region";
  } catch (error) {
    console.error("Error analyzing image region:", error);
    throw error;
  }
};
