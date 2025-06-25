const GEMINI_FLASH_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const HUGGING_FACE_API = "https://api-inference.huggingface.co/models/gpt2";

export const freeAIProviders = {
  GEMINI_FLASH: {
    name: "Gemini Flash",
    free: true,
    requiresKey: true,
    url: GEMINI_FLASH_API
  },
  OPENAI_GPT4: {
    name: "OpenAI GPT-4 Turbo",
    free: false,
    requiresKey: true,
    url: OPENAI_API
  },
  HUGGING_FACE: {
    name: "Hugging Face",
    free: true,
    requiresKey: false,
    url: HUGGING_FACE_API
  }
};

export const generateVibe = async (prompt, apiKey = "", provider = 'GEMINI_FLASH') => {
  try {
    const providerConfig = freeAIProviders[provider];

    if (!providerConfig) {
      throw new Error("Invalid AI provider");
    }

    const headers = {
      "Content-Type": "application/json",
    };

    let response;
    let requestBody;

    if (provider === 'GEMINI_FLASH') {
      // Gemini Flash API requires API key in URL
      const url = `${providerConfig.url}?key=${apiKey}`;

      requestBody = JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a poetic, artistic NFT description for: ${prompt}.
            Use vivid imagery and metaphorical language. Keep it between 20-40 words.`
          }]
        }],
        safetySettings: [{
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 200
        }
      });

      response = await fetch(url, {
        method: "POST",
        headers,
        body: requestBody
      });
    }
    else if (provider === 'OPENAI_GPT4') {
      headers["Authorization"] = `Bearer ${apiKey}`;

      requestBody = JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{
          role: "user",
          content: `Create a poetic NFT description: ${prompt}.
          Use artistic language and be creative.`
        }],
        max_tokens: 150
      });

      response = await fetch(providerConfig.url, {
        method: "POST",
        headers,
        body: requestBody
      });
    }
    else { // Hugging Face
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      requestBody = JSON.stringify({ inputs: prompt });

      response = await fetch(providerConfig.url, {
        method: "POST",
        headers,
        body: requestBody
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || "Generation failed"}`);
    }

    const data = await response.json();

    // Parse response based on provider
    if (provider === 'GEMINI_FLASH') {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate vibe";
    }
    else if (provider === 'OPENAI_GPT4') {
      return data.choices?.[0]?.message?.content || "Could not generate vibe";
    }
    else {
      return data[0]?.generated_text || "Could not generate vibe";
    }
  } catch (error) {
    console.error("AI generation error:", error);
    return `Failed to generate vibe: ${error.message}`;
  }
};
