# 🎤 ElevenLabs TTS Integration - Agent Stage

## Overview

Agent Stage now uses **ElevenLabs** for professional, high-quality text-to-speech generation, providing each advisor with a unique, realistic voice that matches their personality.

## 🎯 **Features Implemented**

### **Individual Advisor Voices**
Each advisor has been carefully mapped to a specific ElevenLabs voice that matches their personality AND gender:

**MALE ADVISORS:**
- **DJ Vans** (Chief of Staff) → **Josh** (`ErXwobaYiN019PkySvjV`)
  - Young, energetic political operative (JD Vance-inspired)
  - Settings: Low stability (0.4), moderate similarity (0.6), high style (0.8)

- **General Jake Sullivan-Peters** → **Antoni** (`Zlb1dXrM653N07WRdFW3`) 
  - Deep, authoritative military voice
  - Settings: High stability (0.8), high similarity (0.9), low style (0.1)

- **Ilon Tusk** (Tech Advisor) → **Michael** (`flq6f7yk4E4fJM5XTYuZ`)
  - Eccentric, distinctive tech entrepreneur voice (Elon Musk-inspired)
  - Settings: Very low stability (0.3), moderate similarity (0.7), very high style (0.9)

- **Dr. Anthony Birx-Fauci** (Healthcare) → **Bill** (`pqHfZKP75CvOlQylNhV4`)
  - Authoritative medical expert voice
  - Settings: Very high stability (0.9), very high similarity (0.9), very low style (0.1)

**FEMALE ADVISORS:**
- **Kellyanne Conway-Smith** → **Elli** (`MF3mGyEYCl7XYWbV9V6O`)
  - Professional female political voice
  - Settings: Moderate stability (0.6), high similarity (0.8), moderate style (0.5)

- **Dr. Janet Powell-Summers** (Economic) → **Emily** (`LcfcDJNUP1GQjkzn1xUU`)
  - Sophisticated, academic economist voice
  - Settings: High stability (0.7), very high similarity (0.9), low style (0.2)

- **Alexandria Green-Cortez** (Environmental) → **Rachel** (`21m00Tcm4TlvDq8ikWAM`)
  - Passionate young female activist voice
  - Settings: Very low stability (0.2), moderate similarity (0.6), very high style (0.9)

- **Director Sarah Haspel-Burns** (Intelligence) → **Domi** (`AZnzlk1XvdvUeBnXmlld`)
  - Mysterious, secretive intelligence voice
  - Settings: High stability (0.8), high similarity (0.8), low style (0.3)

### **BBC-Style Narrator Voice**
- **Urgent Events/Briefings** → **Deep Professional Narrator** (`onwK4e9ZLuTAKqWW03F9`)
  - Deep, authoritative BBC-style voice for crisis announcements
  - Settings: Very high stability (0.8), high similarity (0.9), low style (0.2)

## 🔧 **Technical Implementation**

### **Voice Settings Optimization**
Each advisor has carefully tuned voice parameters:
- **Stability**: Controls voice consistency (0.1-0.9)
- **Similarity Boost**: Maintains voice character (0.6-0.9) 
- **Style**: Adds personality variation (0.1-0.9)
- **Speaker Boost**: Enabled for all voices

### **Model Configuration**
- **Model**: `eleven_multilingual_v2` (highest quality)
- **Output Format**: MP3
- **Speaker Boost**: Enabled for enhanced clarity

## 🚀 **Setup Instructions**

### 1. Get ElevenLabs API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Go to your profile → API Keys
3. Generate a new API key

### 2. Configure Environment
Add to your `.env` file:
```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Install Dependencies
```bash
npm install @elevenlabs/elevenlabs-js
```

### 4. Start the Server
```bash
npm run build
npm start
```

## 📊 **Usage Examples**

### **Advisor Speech Generation**
```typescript
// Automatically called when advisors respond
const audioUrl = await ttsService.generateAdvisorSpeech(
  'chief_staff',     // advisor ID
  'Your message',    // text to speak
  'DJ Vans'         // advisor name
);
```

### **Event Narration**
```typescript
// Automatically called for urgent events
const audioUrl = await ttsService.generateUrgentBriefing(
  'Breaking news text...'
);
```

## 🎭 **Voice Personality Mapping**

The voice selection was carefully chosen to match each advisor's character:

| Advisor | Personality | Voice Choice | Reasoning |
|---------|-------------|--------------|-----------|
| DJ Vans | Energetic political operative (male) | Josh - Young, dynamic male | Matches JD Vance-inspired character with appropriate gender |
| General | Military authority (male) | Antoni - Deep, commanding male | Perfect for defense expertise with masculine authority |
| Ilon Tusk | Tech eccentric (male) | Michael - Eccentric male | Captures Elon Musk entrepreneurial energy with correct gender |
| Kellyanne | Political strategist (female) | Elli - Professional female | Polished political communication |
| Dr. Janet | Academic economist (female) | Emily - Sophisticated female | Intellectual, analytical tone |
| Dr. Anthony | Medical authority (male) | Bill - Clinical, trusted male | Authoritative healthcare expert |
| Alexandria | Environmental activist (female) | Rachel - Passionate female | Captures activist energy |
| Director Sarah | Intelligence operative (female) | Domi - Mysterious female | Secretive, professional spy voice |

## 🔍 **Monitoring & Logs**

Look for these log messages to confirm ElevenLabs is working:
- `🎤 [ElevenLabs TTS] Generating speech for [Advisor] with voice: [VoiceID]`
- `💾 [ElevenLabs TTS] Saved audio to: [filename]`
- `🎤 [ElevenLabs TTS] Generating urgent briefing with deep BBC-style voice...`

## ⚡ **Performance**

- **Generation Time**: 2-5 seconds per advisor response
- **Audio Quality**: Professional broadcast quality
- **File Size**: ~400-600KB per response (30-60 seconds)
- **Caching**: Audio files are cached in `public/audio/`

## 🔧 **Troubleshooting**

### No Audio Generated
1. Check `ELEVENLABS_API_KEY` is set correctly
2. Verify API key has sufficient credits
3. Check network connectivity to ElevenLabs

### Wrong Voice Used
1. Check advisor ID mapping in `voiceMap`
2. Verify voice IDs are correct ElevenLabs voice IDs
3. Check logs for voice selection confirmation

### Audio Quality Issues  
1. Adjust `voiceSettings` for specific advisor
2. Check `modelId` is set to `eleven_multilingual_v2`
3. Verify `useSpeakerBoost` is enabled

## 🎉 **Success Indicators**

✅ **Working Correctly When:**
- Each advisor has a distinct, recognizable voice
- Event narrations use deep, professional BBC-style voice  
- Audio generation takes 2-5 seconds
- Logs show "ElevenLabs TTS" messages
- Audio files appear in `public/audio/` directory

The ElevenLabs integration dramatically enhances the Agent Stage experience with professional-quality, personality-matched voices for every advisor and BBC-style narration for critical events!
