
import { GoogleGenAI } from "@google/genai";
import { HISTORICAL_SCANNER_SYSTEM_PROMPT } from '../constants';
import { HistoryAnalysisResult } from '../types';

/**
 * Converts a File object to a Base64 string for the API
 */
const fileToPart = async (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the brokerage statement using Gemini
 */
export const analyzeBrokerageStatement = async (file: File): Promise<HistoryAnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToPart(file);

  // Using 'gemini-3-flash-preview' for advanced OCR and behavioral analysis tasks.
  const model = 'gemini-3-flash-preview'; 

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          {
            text: "Analyze this brokerage statement image. Extract transactions, look up their historical market context using Google Search, and diagnose the behavioral biases. Return JSON."
          }
        ]
      },
      config: {
        systemInstruction: HISTORICAL_SCANNER_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text || "{}";
    
    // Clean up potential markdown formatting (```json ... ```)
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
    const match = text.match(jsonBlockRegex);
    if (match) {
      text = match[1];
    } else {
       const genericBlockRegex = /```\s*(\{[\s\S]*?\})\s*```/;
       const matchGeneric = text.match(genericBlockRegex);
       if (matchGeneric) {
         text = matchGeneric[1];
       }
    }

    text = text.trim();

    const jsonResult = JSON.parse(text) as HistoryAnalysisResult;
    return jsonResult;

  } catch (error) {
    console.error("Historical Analysis Failed:", error);
    throw error;
  }
};
