import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY ?? "";
const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const client = new GoogleGenerativeAI(apiKey);

// Call Gemini and validate the JSON response against a zod schema.
// Retries once if the model returns malformed output.
export async function runStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
): Promise<T> {
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
  });

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
