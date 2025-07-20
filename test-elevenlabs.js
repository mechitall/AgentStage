const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment');
    return;
  }
  
  console.log('🔑 ElevenLabs API Key:', apiKey ? 'PROVIDED' : 'MISSING');
  
  try {
    const elevenlabs = new ElevenLabsClient({ apiKey });
    
    console.log('✅ ElevenLabsClient created successfully');
    
    // Test with Adam voice
    const testText = "Hello, this is a test of the ElevenLabs integration for Agent Stage.";
    const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
    
    console.log('🎤 Generating test audio...');
    
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: testText,
      modelId: 'eleven_multilingual_v2',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.7,
        style: 0.3,
        useSpeakerBoost: true
      }
    });
    
    console.log('🎵 Audio generated successfully!');
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    
    const fileName = `test-elevenlabs-${Date.now()}.mp3`;
    const audioPath = path.join(__dirname, 'public', 'audio', fileName);
    fs.writeFileSync(audioPath, audioBuffer);
    
    console.log('💾 Test audio saved to:', fileName);
    console.log('🎉 ElevenLabs integration test SUCCESSFUL!');
    
  } catch (error) {
    console.error('❌ ElevenLabs test failed:', error.message);
    if (error.response) {
      console.error('📝 Response data:', error.response.data);
    }
  }
}

testElevenLabs();
