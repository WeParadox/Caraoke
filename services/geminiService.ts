import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateLyrics = async (title: string, artist: string): Promise<string[]> => {
  try {
    const client = getClient();
    const prompt = `
      You are a precise lyrics database for a karaoke application. 
      Please provide the full lyrics for the song "${title}" by "${artist || 'Unknown Artist'}".

      STRICT RULES:
      1. Return ONLY the lyrics as plain text, line by line.
      2. LANGUAGE HANDLING: If the song is in a non-English language (specifically Tamil, Hindi, Telugu, etc.), you MUST provide the lyrics TRANSLITERATED into English alphabets (Romanized).
      3. DO NOT TRANSLATE the meaning of the words into English. The goal is to sing the original words using English characters.
      4. Do not include section headers like [Chorus], [Verse], etc., unless they are absolutely necessary for context, but prefer clean text.
      5. Do not add any introductory or concluding text.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    // Split by new line and remove empty lines
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  } catch (error) {
    console.error("Gemini lyrics generation failed:", error);
    throw error;
  }
};