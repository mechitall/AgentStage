import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

interface TTSConfig {
  openaiApiKey: string;
  aiAcousticsApiKey?: string;
}

export class TTSService {
  private readonly openai: OpenAI;
  private readonly aiAcousticsApiKey?: string;
  private readonly audioDir: string;

  constructor(config: TTSConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.aiAcousticsApiKey = config.aiAcousticsApiKey;
    this.audioDir = path.join(process.cwd(), 'public', 'audio');
    
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  async generateAdvisorSpeech(
    advisorId: string,
    text: string,
    advisorName: string
  ): Promise<string> {
    try {
      // Voice mapping optimized to match real-world counterparts and personalities
      const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx'> = {
        // Original 4 advisors
        'chief_staff': 'alloy',           // DJ Vans - energetic young political operative
        'national_security': 'onyx',      // General - deep, authoritative military voice
        'tech_advisor': 'echo',           // Ilon Tusk - quirky tech entrepreneur
        'counselor': 'nova',              // Kellyanne - professional female political voice
        
        // New 4 advisors
        'economic_advisor': 'fable',      // Dr. Janet - sophisticated economist voice
        'healthcare_advisor': 'onyx',     // Dr. Anthony - authoritative medical expert
        'environmental_advisor': 'nova',  // Alexandria - passionate young female activist
        'intelligence_advisor': 'echo',   // Director Sarah - mysterious, secretive voice
      };

      const voice = voiceMap[advisorId] || 'alloy';
      
      // Speed adjustments to match personalities and speaking patterns
      const speedMap: Record<string, number> = {
        // Original advisors
        'chief_staff': 1.05,         // DJ Vans - fast-talking political operative
        'national_security': 0.90,   // General - measured, deliberate military speech
        'tech_advisor': 0.95,        // Ilon Tusk - distinctive cadence like Elon
        'counselor': 1.00,           // Kellyanne - smooth political speaker
        
        // New advisors
        'economic_advisor': 0.95,    // Dr. Janet - measured economist speech
        'healthcare_advisor': 0.85,  // Dr. Anthony - slow, careful medical expert
        'environmental_advisor': 1.10, // Alexandria - passionate, rapid activist speech
        'intelligence_advisor': 0.90,  // Director Sarah - deliberate, secretive tone
      };

      const speed = speedMap[advisorId] || 0.95;
      
      console.log(`🎤 [TTS] Generating speech for ${advisorName} (${advisorId}) with voice: ${voice}, speed: ${speed}`);

      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: voice,
        input: text,
        response_format: 'mp3',
        speed: speed
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const fileName = `${advisorId}_${Date.now()}.mp3`;
      
      const audioPath = path.join(this.audioDir, fileName);
      fs.writeFileSync(audioPath, audioBuffer);
      
      console.log(`💾 [TTS] Saved audio to: ${fileName}`);
      
      if (this.aiAcousticsApiKey) {
        console.log(`⚠️ [TTS] AI-Coustics enhancement temporarily disabled, using original audio`);
      }
      
      return `/audio/${fileName}`;

    } catch (error) {
      console.error(`❌ [TTS] Failed to generate speech for ${advisorName}:`, error);
      throw new Error(`TTS generation failed: ${error}`);
    }
  }

  async generateUrgentBriefing(text: string): Promise<string> {
    try {
      console.log(`🎤 [TTS] Generating urgent briefing with news anchor voice...`);
      
      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'nova',
        input: text,
        response_format: 'mp3',
        speed: 0.9
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const fileName = `urgent_briefing_${Date.now()}.mp3`;
      
      const audioPath = path.join(this.audioDir, fileName);
      fs.writeFileSync(audioPath, audioBuffer);
      
      console.log(`💾 [TTS] Saved urgent briefing audio to: ${fileName}`);
      
      return `/audio/${fileName}`;
      
    } catch (error) {
      console.error(`❌ [TTS] Failed to generate urgent briefing:`, error);
      throw new Error(`Urgent briefing TTS failed: ${error}`);
    }
  }

  async cleanupOldAudio(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = fs.readdirSync(this.audioDir);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = path.join(this.audioDir, file);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ [TTS] Cleaned up old audio file: ${file}`);
          }
        }
      }
      
      console.log(`🧹 [TTS] Audio cleanup completed`);
    } catch (error) {
      console.error(`❌ [TTS] Audio cleanup failed:`, error);
    }
  }

  audioExists(fileName: string): boolean {
    const filePath = path.join(this.audioDir, fileName);
    return fs.existsSync(filePath);
  }

  getAudioPath(fileName: string): string {
    return path.join(this.audioDir, fileName);
  }
}
