/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Groq from "groq-sdk";

let groqClient: Groq | null = null;

function getGroqClient() {
  if (!groqClient) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GROQ_API_KEY is missing. Please add it to your environment variables to use the Smart Scan feature.");
    }
    groqClient = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return groqClient;
}

export async function scanPrescription(base64Image: string) {
  const groq = getGroqClient();
  const model = "llama-3.2-90b-vision-preview";
  
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

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content || "[]";
    // Clean potential markdown code blocks
    const cleanedText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("OCR Scan Error:", error);
    throw new Error("Failed to scan prescription. Please try again or enter manually.");
  }
}
