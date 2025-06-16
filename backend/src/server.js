const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { credentials, validateCredentials } = require('./config/credentials');
const { auth } = require('./config/auth.config');
const authRoutes = require('./routes/auth.routes');
const streamRoutes = require('./routes/stream.routes');
const commandRoutes = require('./routes/command.routes');
const autoMessageRoutes = require('./routes/autoMessage.routes');
const pointsRoutes = require('./routes/points.routes');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
    cors: {
        origin: credentials.urls.client,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io instance available to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: [
        credentials.urls.client,
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: credentials.nodeEnv
    });
});

// Routes
app.use('/auth', authRoutes);
app.use('/stream', streamRoutes);
app.use('/commands', commandRoutes);
app.use('/auto-messages', autoMessageRoutes);
app.use('/points', pointsRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'YouTube Live Chat Bot API',
        version: '1.0.0',
        status: 'operational'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: credentials.nodeEnv === 'development' ? err.message : undefined
    });
});

// Database connection with retry
const connectDB = async (retries = 5) => {
    try {
        await mongoose.connect(credentials.database.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying database connection... (${retries} attempts left)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error('Failed to connect to MongoDB:', error);
            process.exit(1);
        }
    }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Handle authentication
    socket.on('authenticate', async (token) => {
        try {
            const decoded = auth.verifyToken(token);
            socket.user = decoded;
            socket.join(`user:${decoded.id}`);
            socket.emit('authenticated');
        } catch (error) {
            socket.emit('error', 'Authentication failed');
        }
    });

    // Handle joining a channel's chat
    socket.on('join-channel', (channelId) => {
        socket.join(`channel:${channelId}`);
        console.log(`Client joined channel ${channelId}`);
    });

    // Handle leaving a channel's chat
    socket.on('leave-channel', (channelId) => {
        socket.leave(`channel:${channelId}`);
        console.log(`Client left channel ${channelId}`);
    });
});

// Start server
const startServer = async () => {
    try {
        // Validate credentials
        console.log('🔍 Validating credentials...');
        await validateCredentials();
        
        // Verify YouTube API credentials
        console.log('🔍 Verifying YouTube API credentials...');
        const youtubeVerified = await auth.verifyYouTubeCredentials();
        if (!youtubeVerified) {
            throw new Error('YouTube API credentials verification failed');
        }

        // Connect to database
        await connectDB();

        // Start server
        const port = process.env.PORT || credentials.port;
        httpServer.listen(port, () => {
            console.log(`
🚀 Server is running!
📡 Port: ${port}
🌍 Environment: ${credentials.nodeEnv}
🔗 API URL: ${credentials.urls.api}
👥 Client URL: ${credentials.urls.client}
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

startServer(); 