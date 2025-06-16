const { GoogleGenerativeAI } = require('@google/generative-ai');
const { credentials } = require('./credentials');

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(credentials.ai.geminiApiKey);

// Configure Gemini model with optimized settings for YouTube chat
const model = genAI.getGenerativeModel({
    model: 'gemini-pro-vision', // Using vision model for better context understanding
    generationConfig: {
        temperature: 0.3, // Lower temperature for more focused responses
        topK: 20, // Reduced for more focused responses
        topP: 0.8, // Balanced for quality and cost
        maxOutputTokens: 200, // Shorter responses for YouTube chat
    },
});

module.exports = {
    model,
    genAI
}; 