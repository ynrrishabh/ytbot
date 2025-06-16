# YouTube Live Chat Bot Backend

A powerful backend for managing YouTube Live Chat interactions, built with Node.js and Express.

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the setup script:
   ```bash
   npm run setup
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Credentials Setup

The bot requires several API keys and credentials to function. You can set them up in two ways:

### 1. Using the Setup Script (Recommended)

Run the setup script and follow the interactive prompts:
```bash
npm run setup
```

The script will:
- Guide you through entering all required credentials
- Validate the credentials
- Create a `.env` file with your settings
- Generate a secure JWT secret if you don't provide one

### 2. Manual Setup

Create a `.env` file in the root directory with the following variables:

```env
# Required Credentials
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret

# Optional Settings (with defaults)
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:5000
REDIRECT_URI=http://localhost:5000/auth/google/callback
```

### Getting the Required Credentials

1. **YouTube API Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Create API key

2. **MongoDB Connection**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string

3. **Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key

4. **JWT Secret**:
   - Generate a random string (at least 32 characters)
   - Or let the setup script generate one for you

## Development

- `npm run dev`: Start development server with hot reload
- `npm start`: Start production server
- `npm run setup`: Run the credentials setup script

## API Documentation

[API documentation will be added here]

## License

MIT 