import { GoogleGenAI } from "@google/genai";

export interface SubtopicResponse {
  title: string;
  category?: string;
  content: string;
  keyPoints?: string[];
  examples?: string[];
  sourcePage?: string;
  practice?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

export interface LessonResponse {
  title: string;
  description?: string;
  subtopics: SubtopicResponse[];
}

export async function generateCartoonAvatar(
  base64Image: string,
  apiKey?: string
): Promise<string> {
  let envKey = "";
  if (typeof process !== "undefined" && process.env) {
    envKey = process.env.GEMINI_API_KEY || "";
  } else if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
  }
  const finalApiKey = apiKey || envKey || localStorage.getItem('gemini_api_key') || "";
  
  if (!finalApiKey) {
    throw new Error("Gemini API key is required. Please set it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const mimeTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: 'Turn this portrait image into a fun, colorful, flat vector illustration cartoon avatar. Highly stylized, clean lines, solid colors.',
          },
        ],
      },
      config: {
         // Some models might not support advanced configs, so we keep it simple
      }
    });

    for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image was returned by the AI.");
  } catch (error) {
    console.error("Cartoon generation failed:", error);
    throw new Error("AI Cartoon generation failed. Check API limits or try again.");
  }
}

/**
 * Common AI call function with retry logic
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = "",
  apiKey?: string,
  retries: number = 3,
  retryDelay: number = 2000
) {
  let envKey = "";
  if (typeof process !== "undefined" && process.env) {
    envKey = process.env.GEMINI_API_KEY || "";
  } else if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
  }
  const finalApiKey = apiKey || envKey || localStorage.getItem('gemini_api_key') || "";
  
  if (!finalApiKey) {
    throw new Error("Gemini API key is required. Please set it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      // Using the models.generateContent syntax which is confirmed working in this environment
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
        }
      });
      
      if (!result.text) {
        throw new Error("Empty response from AI");
      }
      
      return result.text;
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
      
      // If it's a quote or rate limit error, wait longer
      const waitTime = error.message?.includes('429') ? retryDelay * 2 : retryDelay;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

/**
 * Specialized function for generating grammar lessons
 */
export async function generateGrammarLesson(
  inputText: string, 
  apiKey: string | null, 
  customInstruction: string = ""
): Promise<LessonResponse> {
  const systemPrompt = `You are an expert English Grammar teacher for Bengali students. 
  Create a detailed, structured lesson based EXCLUSIVELY on the provided "TEXT TO ANALYZE".
  Do NOT repeat the same lessons you've generated before. The title and subtopics MUST directly reflect the new text.
  
  CRITICAL FORMATTING RULES:
  1. STRICTLY FORBIDDEN: Do NOT include "English Grammar Lesson:" or "Grammar Lesson:" or any similar redundant prefix in titles.
  2. STRICT REQUIREMENT: Do NOT omit any word, sentence, or concept from the input text. You must include EVERYTHING from the provided text in the lesson.
  3. Use clear Bengali explanations for concepts.
  4. EXAMPLES MUST BE PLACED IN THE \`examples\` JSON ARRAY. Do NOT put examples inside the \`content\` string. Each example in the array should be an object with \`en\` (the English sentence) and \`bn\` (the Bengali analysis in parentheses).
  5. Format the \`bn\` analysis exactly like this: (এখানে noun "tail" verb "chased"-এর action receive করছে).
  6. Ensure a mix of theory and examples.
  7. Generate 3 to 5 practice questions for each subtopic to ensure thorough testing.
  8. Output must be a valid JSON matching the schema.`;
  
  const expectedSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      subtopics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            content: { type: "string", description: "Detailed explanation in Bengali and English (DO NOT put examples here)" },
            keyPoints: { type: "array", items: { type: "string" } },
            examples: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  en: { type: "string", description: "English example sentence" }, 
                  bn: { type: "string", description: "Bengali analysis or translation" } 
                },
                required: ["en", "bn"]
              } 
            },
            sourcePage: { type: "string" },
            practice: {
              type: "array",
              minItems: 3,
              description: "Array of 3 to 5 practice questions",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "number", description: "0-indexed" },
                  explanation: { type: "string" }
                }
              }
            }
          },
          required: ["title", "content"]
        }
      }
    },
    required: ["title", "subtopics"]
  };

  const fullPrompt = `### TEXT TO ANALYZE ###\n${inputText}\n#######################\n\n### USER INSTRUCTIONS ###\n${customInstruction}\n#######################\n\nOnly create a lesson based on the content in the "TEXT TO ANALYZE" section. Do not generate a lesson about the examples provided in the User Instructions unless they are also in the Text To Analyze.\n\nOutput JSON schema: ${JSON.stringify(expectedSchema)}`;

  const responseText = await callGemini(fullPrompt, systemPrompt, apiKey || undefined);
  const cleanedText = (responseText || "{}").replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText) as LessonResponse;
}
