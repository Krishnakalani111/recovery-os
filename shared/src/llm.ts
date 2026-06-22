import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Built lazily so .env is loaded before we read the key.
function getModel(system: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
  });
}

// Call Gemini and validate the JSON response against a zod schema.
// Retries once if the model returns malformed output.
export async function runStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
): Promise<T> {
  const model = getModel(system);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await model.generateContent(user);
    const text = res.response.text();
    try {
      return schema.parse(JSON.parse(text));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`LLM output failed validation: ${String(lastErr)}`);
}
