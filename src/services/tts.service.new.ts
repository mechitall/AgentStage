import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

interface TTSConfig {
  openaiApiKey: string;
  aiAcousticsApiKey?: string;
}

interface AICouszticsUploadResponse {
  file_id: string;
  status: string;
}

export class TTSService {
  private readonly openai: OpenAI;
  private readonly aiAcousticsApiKey?: string;
  private readonly audioDir: string;

  constructor(config: TTSConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.aiAcousticsApiKey = config.aiAcousticsApiKey;
    this.audioDir = path.join(process.cwd(), 'public', 'audio');
    
    // Ensure audio directory exists
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Generate TTS audio for advisor briefings
   */
  async generateAdvisorSpeech(
    advisorId: string,
    text: string,
    advisorName: string
  ): Promise<string> {
    try {
      // Map advisor voices to professional TTS voices
      const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx'> = {
        'chief_of_staff': 'alloy',     // Professional female voice
        'press_secretary': 'nova',      // Clear communication voice
        'defense_advisor': 'onyx',      // Authoritative male voice
        'economic_advisor': 'echo',     // Analytical voice
        'tech_advisor': 'fable'         // Innovative/modern voice
      };

      const voice = voiceMap[advisorId] || 'alloy';
      
      console.log(`🎤 [OpenAI] Generating TTS for ${advisorName}...`);
      console.log(`🎤 [TTS] Generating speech for ${advisorName} with voice: ${voice}`);

      // Generate speech using OpenAI TTS
      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd', // High quality model
        voice: voice,
        input: text,
        response_format: 'mp3',
        speed: 0.95 // Slightly slower for professional delivery
      });

      // Convert response to buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      // Generate unique filename
      const fileName = `${advisorId}_${Date.now()}.mp3`;
      console.log(`💾 [TTS] Saved audio to: ${fileName}`);

      // Try AI-Coustics enhancement, fall back to original if it fails
      return await this.enhanceWithAIAcoustics(fileName, audioBuffer);

    } catch (error) {
      console.error(`❌ [TTS] Failed to generate speech for ${advisorName}:`, error);
      throw new Error(`TTS generation failed: ${error}`);
    }
  }

  /**
   * Generate TTS for urgent briefings with news anchor voice
   */
  async generateUrgentBriefing(text: string): Promise<string> {
    try {
      console.log(`🎤 [TTS] Generating urgent briefing with news anchor voice...`);
      
      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'nova', // Professional news anchor voice
        input: text,
        response_format: 'mp3',
        speed: 0.9 // Slower for urgency and clarity
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const fileName = `urgent_briefing_${Date.now()}.mp3`;
      
      console.log(`💾 [TTS] Saved urgent briefing audio to: ${fileName}`);
      
      // Try AI-Coustics enhancement, fall back to original if it fails
      return await this.enhanceWithAIAcoustics(fileName, audioBuffer);
      
    } catch (error) {
      console.error(`❌ [TTS] Failed to generate urgent briefing:`, error);
      throw new Error(`Urgent briefing TTS failed: ${error}`);
    }
  }

  /**
   * Enhance audio quality using AI-Coustics speech enhancement
   * Falls back to original audio if enhancement fails
   */
  private async enhanceWithAIAcoustics(fileName: string, audioBuffer: Buffer): Promise<string> {
    // Save original audio first
    const originalPath = this.saveOriginalAudio(fileName, audioBuffer);
    
    if (!this.aiAcousticsApiKey) {
      console.log(`⚠️ [TTS] AI-Coustics API key not provided, using original audio`);
      return fileName;
    }

    console.log(`🔊 [TTS] Enhancing audio with AI-Coustics...`);

    try {
      // Try AI-Coustics enhancement
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('file', audioBlob, fileName);
      
      const uploadResponse = await fetch('https://api.ai-coustics.com/v1/speech_enhancement/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiAcousticsApiKey}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        console.log(`⚠️ [TTS] AI-Coustics upload failed (${uploadResponse.status}), using original audio`);
        return fileName;
      }

      const uploadResult = await uploadResponse.json() as AICouszticsUploadResponse;
      if (!uploadResult.file_id) {
        console.log(`⚠️ [TTS] No file_id received, using original audio`);
        return fileName;
      }

      console.log(`📁 [TTS] File uploaded successfully, file_id: ${uploadResult.file_id}`);
      
      // For now, return original audio since AI-Coustics needs proper setup
      console.log(`⚠️ [TTS] AI-Coustics processing temporarily disabled, using original audio`);
      return fileName;

    } catch (error) {
      console.log(`⚠️ [TTS] AI-Coustics enhancement failed, using original audio:`, error);
      return fileName;
    }
  }

  /**
   * Save original audio file without enhancement
   */
  private saveOriginalAudio(fileName: string, audioBuffer: Buffer): string {
    const audioPath = path.join(this.audioDir, fileName);
    fs.writeFileSync(audioPath, audioBuffer);
    console.log(`💾 [TTS] Saved original audio: ${fileName}`);
    return audioPath;
  }

  /**
   * Clean up old audio files to prevent disk space issues
   */
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

  /**
   * Check if audio file exists
   */
  audioExists(fileName: string): boolean {
    const filePath = path.join(this.audioDir, fileName);
    return fs.existsSync(filePath);
  }

  /**
   * Get audio file path
   */
  getAudioPath(fileName: string): string {
    return path.join(this.audioDir, fileName);
  }
}
