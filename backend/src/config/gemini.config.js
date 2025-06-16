const { GoogleGenerativeAI } = require('@google/generative-ai');
const { credentials } = require('./credentials');

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(credentials.ai.geminiApiKey);

// Configure Gemini model with version 2.0 (gemini-pro)
const model = genAI.getGenerativeModel({
    model: 'gemini-pro',
    generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
    },
});

module.exports = {
    model,
    genAI
}; 