# 🎤 Text-to-Speech (TTS) Integration Guide

Agent Stage now supports voice synthesis for advisor briefings using OpenAI's TTS models and AI-Coustics professional audio enhancement.

## Features

### 🗣️ Voice-Enabled Experience
Each advisor has a distinct journalist-style voice:
- **DJ Vans** (Chief of Staff): Energetic, young voice (`alloy`)
- **General Jake Sullivan-Peters**: Authoritative male voice (`echo`)
- **Ilon Tusk**: Quirky, innovative voice (`fable`) 
- **Kellyanne Conway-Smith**: Professional female voice (`nova`)

**Urgent Briefings** use a professional news anchor voice (`onyx`) for high/critical urgency events.

### 🎵 Professional Audio Enhancement
- High-quality TTS using OpenAI's `tts-1-hd` model
- AI-Coustics Speech Enhancement API for broadcast-quality sound:
  - **Speech optimization** for voice content
  - **Noise reduction** to remove artifacts
  - **Dereverberation** to reduce echo
  - **Loudness normalization** for consistent levels
- Automatic cleanup of old audio files

### 🎮 User Experience
- Play buttons appear with each advisor briefing
- **"🎙️ Play Briefing"** buttons for urgent/critical events
- Audio controls with loading/playing/error states
- Automatic stop when new audio starts
- Fallback to text-only if TTS fails

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# Required - OpenAI API key for TTS
OPENAI_API_KEY=sk-proj-your-key-here

# Optional - AI-Coustics API key for professional audio enhancement
AI_ACOUSTICS_API_KEY=your-ai-coustics-key-here
```

### 2. AI-Coustics API Key

To enable broadcast-quality audio enhancement:

1. Sign up at AI-Coustics (https://ai-coustics.com)
2. Get your API key from the developer dashboard
3. Add it to your `.env` file as `AI_ACOUSTICS_API_KEY`

The system uses the AI-Coustics Speech Enhancement API with the following features:
- **Speech Enhancement**: Optimized for voice/speech content
- **Noise Reduction**: Removes background noise and artifacts
- **Dereverberation**: Reduces echo and room reverb
- **Loudness Normalization**: Consistent audio levels

Without this key, you'll still get high-quality OpenAI TTS audio.

## Technical Details

### Voice Mapping
```typescript
const voiceMapping = {
  'chief_staff': 'alloy',      // DJ Vans - energetic
  'national_security': 'echo', // General - authoritative  
  'tech_advisor': 'fable',     // Ilon Tusk - quirky
  'counselor': 'nova',         // Kellyanne - professional
  'urgent_briefing': 'onyx'    // News Anchor - urgent briefings
};
```

### Audio Processing
1. OpenAI TTS generates high-quality MP3 audio
2. AI-Coustics Speech Enhancement API processes audio:
   - Upload audio file to AI-Coustics
   - Process with speech enhancement, noise reduction, and normalization
   - Poll for completion and download enhanced result
3. Files saved to `/public/audio/` directory
4. Automatic cleanup after 24 hours

### API Integration Details
**AI-Coustics API Flow:**
```
1. POST /v1/speech_enhancement/upload - Upload audio file
2. POST /v1/speech_enhancement - Start processing job
3. GET /v1/speech_enhancement/status/{job_id} - Poll for completion
4. Download enhanced audio from provided URL
```

**Enhancement Settings:**
- `enhancement_type: 'speech'` - Optimized for voice content
- `noise_reduction: true` - Remove background noise
- `dereverb: true` - Reduce echo and reverb
- `loudness_normalization: true` - Consistent volume levels

### Frontend Integration
- Audio controls appear automatically when `audioUrl` is present
- Responsive design matches the chat interface
- Error handling with fallback to text-only mode

## Usage

1. Start a new game session
2. Wait for urgent briefings (high/critical urgency events)
3. Click the "🎙️ Play Briefing" button to hear the news anchor voice
4. Wait for advisor briefings and click "🔊 Play" for individual advisor voices
5. Audio plays with visual feedback (📻 Broadcasting / ▶️ Playing)
6. Multiple audio streams are managed automatically

## Troubleshooting

### No Audio Controls
- Check OpenAI API key is set correctly
- Verify network connection for TTS generation
- Check browser console for errors

### Audio Enhancement Not Working
- Verify AI Acoustics API key is correct
- Check AI Acoustics service status
- Audio will fallback to OpenAI TTS without enhancement

### Audio Files Not Playing
- Ensure `/public/audio/` directory exists and is writable
- Check browser audio permissions
- Verify MP3 file format support

## Performance Notes

- TTS generation adds 2-3 seconds to advisor response time
- Audio files are cached locally to avoid regeneration
- Old files are automatically cleaned up to save disk space
- Enhancement processing adds additional 1-2 seconds

Enjoy the immersive voice experience! 🎭🎤
