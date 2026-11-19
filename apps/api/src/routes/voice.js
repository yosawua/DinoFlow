const express = require('express');
const router = express.Router();
const elevenlabs = require('../services/elevenlabs');

router.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Falta parámetro text' });

    const result = await elevenlabs.generateSpeech(text);

    if (result.available && result.audioBuffer) {
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length
      });
      return res.send(result.audioBuffer);
    }

    // Fallback response instructing the browser to use Web Speech API
    res.json({
      fallback: true,
      text,
      engine: 'WebSpeechAPI'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, fallback: true });
  }
});

module.exports = router;
