const express = require('express');
const cors = require('cors');
const connector = require('./connector');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Middleware to ensure LCU is connected
const ensureConnected = (req, res, next) => {
    if (!connector.isConnected) {
        return res.status(503).json({ error: 'LCU not connected' });
    }
    next();
};

// Get Current Summoner
app.get('/api/summoner/current', ensureConnected, async (req, res) => {
    try {
        const data = await connector.request('/lol-summoner/v1/current-summoner');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Match History (Summary)
app.get('/api/matches', ensureConnected, async (req, res) => {
    try {
        // Get current summoner first to get PUUID if needed, but this endpoint uses current-summoner context
        const data = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Specific Match Details
app.get('/api/match/:id', ensureConnected, async (req, res) => {
    try {
        const { id } = req.params;
        const data = await connector.request(`/lol-match-history/v1/games/${id}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Ranked Stats
app.get('/api/ranked', ensureConnected, async (req, res) => {
    try {
        const data = await connector.request('/lol-ranked/v1/current-ranked-stats');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server and Connector
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connector.start();
});
