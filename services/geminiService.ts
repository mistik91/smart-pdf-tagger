
import { GoogleGenAI } from "@google/genai";

/**
 * Analyzes a specific cropped image region to suggest a label or content description.
 * @param base64Image The base64 encoded image string (JPEG/PNG)
 * @returns A suggestion string for the tag
 */
export const analyzeImageRegion = async (base64Image: string): Promise<string> => {
  try {
    // Safely retrieve API Key without crashing if 'process' is undefined
    let apiKey = '';
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      // Ignore process access errors
      console.warn("Could not access process.env");
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
    // Return a safe fallback instead of throwing to prevent app interruption
    return "Analysis Failed";
  }
};
