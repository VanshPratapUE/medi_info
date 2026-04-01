/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function scanPrescription(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a highly specialized medical OCR system designed to extract medication details from prescriptions.
    The input image may be a handwritten or printed prescription, often with messy handwriting or medical abbreviations.
    
    Your goal is to identify ALL medications mentioned and extract:
    1. Drug Name: The brand name or generic name.
    2. Dosage: The strength (e.g., 500mg, 10ml, 5mcg).
    3. Frequency: How often it is taken (e.g., OD, BID, TID, QID, 1-0-1, 1-1-1, Once daily, every 8 hours).
    4. Duration: How long the medication is prescribed for (e.g., 5 days, 1 month, 1 week).

    Special Instructions:
    - Look for common Indian and Global drug names.
    - Interpret "1-0-1" as "Twice a day (Morning and Night)".
    - Interpret "1-1-1" as "Three times a day".
    - Interpret "1-0-0" as "Once daily (Morning)".
    - Interpret "0-0-1" as "Once daily (Night)".
    - Be extremely careful with drug names; if a name is partially legible, use your medical knowledge to suggest the most likely drug.
    - If multiple drugs are listed, extract each one separately.

    Output Format:
    Return ONLY a JSON array of objects. Each object MUST have these keys: "name", "dosage", "frequency", "duration".
    Example: [{"name": "Augmentin", "dosage": "625mg", "frequency": "BID", "duration": "5 days"}]
    If no medications are found, return [].
    
    CRITICAL: Do not include any preamble, markdown formatting (like \`\`\`json), or post-text. Just the raw JSON array.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }, imagePart] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    // Clean potential markdown code blocks
    const cleanedText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("OCR Scan Error:", error);
    throw new Error("Failed to scan prescription. Please try again or enter manually.");
  }
}
