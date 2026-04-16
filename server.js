const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 1. Middleware
app.use(express.json());
// Allow GitHub Pages and local files to talk to this server
app.use(cors({ origin: '*' })); 

// 2. Connect to MongoDB
// We will set the "MONGODB_URI" in the Render dashboard later
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("Connected to MongoDB!"))
    .catch(err => console.error("Database error:", err));

// 3. Define the Score Schema
const scoreSchema = new mongoose.Schema({
    name: String,
    mode: String,
    flagsPlanted: Number,
    minesInGame: Number,
    timeAllowed: String,
    completionTime: String,
    date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// 4. API Endpoints
// SAVE a new score
app.post('/api/scores', async (req, res) => {
    try {
        const newScore = new Score(req.body);
        await newScore.save();
        res.status(201).json({ message: "Score saved!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET top 10 scores
app.get('/api/scores', async (req, res) => {
    try {
        const scores = await Score.find().sort({ date: -1 }).limit(10);
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
