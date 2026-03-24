const express = require('express');
const { createClient } = require('redis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Set up Redis Client
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});
const redisPublisher = redisClient.duplicate();

redisClient.on('error', err => console.error('Redis Client Error', err));
redisPublisher.on('error', err => console.error('Redis Publisher Error', err));

let clients = [];

// Endpoint for SSE (Server-Sent Events)
app.get('/stream', (req, res) => {
    // Keep connection open and send headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add this client to the pool
    clients.push(res);

    req.on('close', () => {
        // Remove client when connection is closed
        clients = clients.filter(client => client !== res);
    });
});

app.post('/api/control', async (req, res) => {
    try {
        const { action } = req.body;
        if (action === 'pause' || action === 'resume') {
            await redisPublisher.publish('github_control', JSON.stringify({ action }));
            res.json({ success: true, action });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function start() {
    try {
        await redisClient.connect();
        await redisPublisher.connect();
        console.log('Connected to Redis');
        
        // Subscribe to pub/sub channel
        await redisClient.subscribe('github_words', (message) => {
            // Forward event to all connected SSE clients
            clients.forEach(client => {
                client.write(`data: ${message}\n\n`);
            });
        });
        
        app.listen(PORT, () => {
            console.log(`Visualizer running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start visualizer', err);
    }
}

start();
