/**
 * ElevenLabs Voice & Audio Notification Service
 * Generates spoken alarm audio with graceful fallback to browser Web Speech API
 */

const env = require('../config/env');

class ElevenLabsService {
  constructor() {
    this.apiKey = env.elevenlabsApiKey;
    this.voiceId = env.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  /**
   * Generates spoken audio stream or buffer for an alert text
   */
  async generateSpeech(text) {
    if (!this.isConfigured()) {
      return {
        available: false,
        useWebSpeechFallback: true,
        text,
        message: 'ElevenLabs API key not configured. Using client-side Web Speech API.'
      };
    }

    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs error: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return {
        available: true,
        useWebSpeechFallback: false,
        audioBuffer: Buffer.from(buffer),
        contentType: 'audio/mpeg'
      };
    } catch (err) {
      console.warn(`⚠️ ElevenLabs synthesis failed (${err.message}). Falling back to browser Web Speech API.`);
      return {
        available: false,
        useWebSpeechFallback: true,
        text,
        error: err.message
      };
    }
  }
}

module.exports = new ElevenLabsService();
