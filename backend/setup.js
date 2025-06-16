const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { validateCredentials } = require('./src/config/credentials');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const questions = [
    {
        name: 'YOUTUBE_API_KEY',
        message: 'Enter your YouTube API Key: ',
        validate: input => input.length > 0
    },
    {
        name: 'GOOGLE_CLIENT_ID',
        message: 'Enter your Google Client ID: ',
        validate: input => input.length > 0
    },
    {
        name: 'GOOGLE_CLIENT_SECRET',
        message: 'Enter your Google Client Secret: ',
        validate: input => input.length > 0
    },
    {
        name: 'MONGODB_URI',
        message: 'Enter your MongoDB URI: ',
        validate: input => input.startsWith('mongodb+srv://')
    },
    {
        name: 'GEMINI_API_KEY',
        message: 'Enter your Gemini API Key: ',
        validate: input => input.length > 0
    },
    {
        name: 'JWT_SECRET',
        message: 'Enter your JWT Secret (or press enter to generate one): ',
        validate: () => true
    }
];

const generateJWTSecret = () => {
    return require('crypto').randomBytes(32).toString('hex');
};

const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question.message, (answer) => {
            if (question.validate(answer)) {
                resolve(answer);
            } else {
                console.log('Invalid input. Please try again.');
                resolve(askQuestion(question));
            }
        });
    });
};

const setup = async () => {
    console.log('\n🚀 Welcome to YouTube Live Chat Bot Setup!');
    console.log('This script will help you set up your credentials.\n');

    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    for (const question of questions) {
        const answer = await askQuestion(question);
        if (question.name === 'JWT_SECRET' && !answer) {
            envContent += `${question.name}=${generateJWTSecret()}\n`;
        } else {
            envContent += `${question.name}=${answer}\n`;
        }
    }

    // Add default values
    envContent += '\n# Default values (can be changed)\n';
    envContent += 'PORT=5000\n';
    envContent += 'NODE_ENV=development\n';
    envContent += 'CLIENT_URL=http://localhost:3000\n';
    envContent += 'API_URL=http://localhost:5000\n';
    envContent += 'REDIRECT_URI=http://localhost:5000/auth/google/callback\n';

    try {
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ Credentials have been saved to .env file');
        
        // Validate the credentials
        console.log('\n🔍 Validating credentials...');
        validateCredentials();
        
        console.log('\n🎉 Setup complete! You can now start the application.');
        console.log('Run "npm run dev" to start the development server.');
    } catch (error) {
        console.error('\n❌ Error saving credentials:', error.message);
    }

    rl.close();
};

setup(); 