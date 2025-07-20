import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';

interface TTSConfig {
  elevenlabsApiKey: string;
  aiAcousticsApiKey?: string;
}

export class TTSService {
  private readonly elevenlabs: ElevenLabsClient;
  private readonly aiAcousticsApiKey?: string;
  private readonly audioDir: string;

  constructor(config: TTSConfig) {
    this.elevenlabs = new ElevenLabsClient({ apiKey: config.elevenlabsApiKey });
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
      // ElevenLabs voice mapping optimized for each advisor's personality and gender
      const voiceMap: Record<string, string> = {
        // MALE ADVISORS - Using distinctly masculine voices
        'chief_staff': 'ErXwobaYiN019PkySvjV',           // Josh - young, energetic male (DJ Vans/JD Vance)
        'national_security': 'Zlb1dXrM653N07WRdFW3',      // Antoni - deep, authoritative military voice (General)
        'tech_advisor': 'flq6f7yk4E4fJM5XTYuZ',          // Michael - eccentric, distinctive male (Ilon Tusk/Elon)
        'healthcare_advisor': 'pqHfZKP75CvOlQylNhV4',     // Bill - authoritative medical expert (Dr. Anthony)
        
        // FEMALE ADVISORS - Using distinctly feminine voices  
        'counselor': 'MF3mGyEYCl7XYWbV9V6O',             // Elli - professional female political voice (Kellyanne)
        'economic_advisor': 'LcfcDJNUP1GQjkzn1xUU',       // Emily - sophisticated economist voice (Dr. Janet)
        'environmental_advisor': '21m00Tcm4TlvDq8ikWAM',   // Rachel - passionate young female activist (Alexandria)
        'intelligence_advisor': 'AZnzlk1XvdvUeBnXmlld',    // Domi - mysterious, secretive female voice (Director Sarah)
      };

      const voiceId = voiceMap[advisorId] || 'pNInz6obpgDQGcFmaJgB'; // Default to Adam
      
      // Stability and similarity settings based on advisor personality
      const voiceSettings = {
        stability: this.getStabilityForAdvisor(advisorId),
        similarityBoost: this.getSimilarityForAdvisor(advisorId),
        style: this.getStyleForAdvisor(advisorId),
        useSpeakerBoost: true
      };
      
      console.log(`🎤 [ElevenLabs TTS] Generating speech for ${advisorName} (${advisorId}) with voice: ${voiceId}`);

      const audioStream = await this.elevenlabs.textToSpeech.convert(voiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2', // High quality model
        voiceSettings: voiceSettings
      });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      const audioBuffer = Buffer.concat(chunks);
      
      const fileName = `${advisorId}_${Date.now()}.mp3`;
      const audioPath = path.join(this.audioDir, fileName);
      fs.writeFileSync(audioPath, audioBuffer);
      
      console.log(`💾 [ElevenLabs TTS] Saved audio to: ${fileName}`);
      
      if (this.aiAcousticsApiKey) {
        console.log(`⚠️ [TTS] AI-Coustics enhancement temporarily disabled, using ElevenLabs audio`);
      }
      
      return `/audio/${fileName}`;

    } catch (error) {
      console.error(`❌ [ElevenLabs TTS] Failed to generate speech for ${advisorName}:`, error);
      throw new Error(`TTS generation failed: ${error}`);
    }
  }

  async generateUrgentBriefing(text: string): Promise<string> {
    try {
      console.log(`🎤 [ElevenLabs TTS] Generating urgent briefing with deep BBC-style voice...`);
      
      // Using a deep, authoritative voice for narrative events (BBC-style)
      const narratorVoiceId = 'onwK4e9ZLuTAKqWW03F9'; // Deep, professional narrator voice
      
      const audioStream = await this.elevenlabs.textToSpeech.convert(narratorVoiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability: 0.8,           // Very stable for professional delivery
          similarityBoost: 0.9,     // High similarity for consistency
          style: 0.2,              // Low style variation for serious tone
          useSpeakerBoost: true
        }
      });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      const audioBuffer = Buffer.concat(chunks);
      
      const fileName = `urgent_briefing_${Date.now()}.mp3`;
      const audioPath = path.join(this.audioDir, fileName);
      fs.writeFileSync(audioPath, audioBuffer);
      
      console.log(`💾 [ElevenLabs TTS] Saved urgent briefing audio to: ${fileName}`);
      
      return `/audio/${fileName}`;
      
    } catch (error) {
      console.error(`❌ [ElevenLabs TTS] Failed to generate urgent briefing:`, error);
      throw new Error(`Urgent briefing TTS failed: ${error}`);
    }
  }

  // Helper methods to get voice settings based on advisor personality
  private getStabilityForAdvisor(advisorId: string): number {
    const stabilityMap: Record<string, number> = {
      'chief_staff': 0.4,           // DJ Vans - less stable, more energetic
      'national_security': 0.8,     // General - very stable, measured
      'tech_advisor': 0.3,          // Ilon Tusk - unstable, eccentric
      'counselor': 0.6,             // Kellyanne - moderately stable spin
      'economic_advisor': 0.7,      // Dr. Janet - stable, professional
      'healthcare_advisor': 0.9,    // Dr. Anthony - very stable, authoritative
      'environmental_advisor': 0.2, // Alexandria - passionate, variable
      'intelligence_advisor': 0.8,  // Director Sarah - stable, secretive
    };
    return stabilityMap[advisorId] || 0.5;
  }

  private getSimilarityForAdvisor(advisorId: string): number {
    const similarityMap: Record<string, number> = {
      'chief_staff': 0.6,           // DJ Vans - some variation for energy
      'national_security': 0.9,     // General - very consistent
      'tech_advisor': 0.7,          // Ilon Tusk - moderately consistent
      'counselor': 0.8,             // Kellyanne - consistent messaging
      'economic_advisor': 0.9,      // Dr. Janet - very consistent, professional
      'healthcare_advisor': 0.9,    // Dr. Anthony - very consistent authority
      'environmental_advisor': 0.6, // Alexandria - varied passion levels
      'intelligence_advisor': 0.8,  // Director Sarah - consistent secrecy
    };
    return similarityMap[advisorId] || 0.7;
  }

  private getStyleForAdvisor(advisorId: string): number {
    const styleMap: Record<string, number> = {
      'chief_staff': 0.8,           // DJ Vans - high style, energetic
      'national_security': 0.1,     // General - low style, serious
      'tech_advisor': 0.9,          // Ilon Tusk - very high style, eccentric
      'counselor': 0.5,             // Kellyanne - moderate style, professional spin
      'economic_advisor': 0.2,      // Dr. Janet - low style, academic
      'healthcare_advisor': 0.1,    // Dr. Anthony - very low style, clinical
      'environmental_advisor': 0.9, // Alexandria - very high style, passionate
      'intelligence_advisor': 0.3,  // Director Sarah - low style, secretive
    };
    return styleMap[advisorId] || 0.5;
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
