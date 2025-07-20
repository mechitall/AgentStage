interface DallEImageRequest {
  prompt: string;
  model: string;
  n: number;
  size: '1024x1024' | '1024x1792' | '1792x1024';
  quality: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

interface DallEImageResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export class NewsImageService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';
  
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ [NewsImages] No OpenAI API key provided, news image generation disabled');
    } else {
      console.log('🖼️ [NewsImages] Service initialized with OpenAI API key');
    }
  }

  /**
   * Generate news report image using DALL-E 3
   */
  async generateNewsImage(
    script: string, 
    context: {
      urgency: 'low' | 'medium' | 'high' | 'critical';
      worldState: any;
      eventTitle: string;
    }
  ): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('⚠️ [NewsImages] Cannot generate image: No OpenAI API key configured');
      return null;
    }

    try {
      console.log(`🖼️ [NewsImages] Generating news image for: "${context.eventTitle}"`);
      
      // Create a detailed image prompt based on the news script and context
      const imagePrompt = this.createImagePrompt(script, context);
      
      const imageRequest: DallEImageRequest = {
        prompt: imagePrompt,
        model: 'dall-e-3',
        n: 1,
        size: '1792x1024', // Wide format for news images
        quality: 'hd',
        style: this.selectImageStyle(context.urgency)
      };

      console.log(`🖼️ [NewsImages] Request parameters:`, {
        promptLength: imagePrompt.length,
        urgency: context.urgency,
        style: imageRequest.style,
        size: imageRequest.size
      });

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageRequest),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ [NewsImages] Image generation failed: ${response.status} - ${error}`);
        return null;
      }

      const result = await response.json() as DallEImageResponse;
      
      if (result.data && result.data.length > 0 && result.data[0].url) {
        const imageUrl = result.data[0].url;
        console.log(`✅ [NewsImages] News image ready: ${imageUrl}`);
        
        if (result.data[0].revised_prompt) {
          console.log(`🖼️ [NewsImages] DALL-E revised prompt: ${result.data[0].revised_prompt}`);
        }
        
        return imageUrl;
      } else {
        console.error('❌ [NewsImages] No image URL in response');
        return null;
      }
    } catch (error) {
      console.error('❌ [NewsImages] Error generating news image:', error);
      return null;
    }
  }

  /**
   * Create a detailed image prompt for news generation
   */
  private createImagePrompt(script: string, context: any): string {
    const urgencyStyle = {
      'critical': 'urgent, dramatic, red breaking news alert, crisis atmosphere',
      'high': 'serious, professional news reporting, concerned tone, important announcement',
      'medium': 'standard news report, professional journalism, informative',
      'low': 'casual news update, light reporting, everyday news'
    };

    const style = urgencyStyle[context.urgency as keyof typeof urgencyStyle] || urgencyStyle.medium;
    
    // Extract key visual elements from the script
    const visualElements = this.extractVisualElements(script, context);
    
    // Create a comprehensive news image prompt
    return `Professional news report illustration: ${style}. ${visualElements}. 
Main topic: "${script.substring(0, 150)}..."
Style: Clean, professional news graphic with presidential seal, American flag, 
White House or Oval Office setting. News headline banner, official government imagery.
High-quality, photorealistic, 16:9 news broadcast style composition.
No text overlays, focus on visual storytelling for: ${context.eventTitle}`;
  }

  /**
   * Extract visual elements from script for better image generation
   */
  private extractVisualElements(script: string, context: any): string {
    const elements = [];
    
    // Look for key terms that suggest visual elements
    if (script.toLowerCase().includes('economy') || script.toLowerCase().includes('market')) {
      elements.push('economic charts, financial graphics, Wall Street imagery');
    }
    if (script.toLowerCase().includes('military') || script.toLowerCase().includes('defense')) {
      elements.push('Pentagon imagery, military assets, strategic maps');
    }
    if (script.toLowerCase().includes('environment') || script.toLowerCase().includes('climate')) {
      elements.push('environmental imagery, earth from space, climate data visualization');
    }
    if (script.toLowerCase().includes('health') || script.toLowerCase().includes('medical')) {
      elements.push('medical imagery, CDC graphics, health statistics');
    }
    if (script.toLowerCase().includes('international') || script.toLowerCase().includes('foreign')) {
      elements.push('world map, international summit imagery, diplomatic meeting');
    }
    if (script.toLowerCase().includes('security') || script.toLowerCase().includes('intelligence')) {
      elements.push('security briefing room, classified documents style, intelligence imagery');
    }
    if (script.toLowerCase().includes('congress') || script.toLowerCase().includes('senate')) {
      elements.push('Capitol building, congressional chamber, legislative imagery');
    }
    
    // Add default presidential elements
    elements.push('presidential podium', 'official government backdrop', 'American symbolism');
    
    return elements.length > 0 ? elements.join(', ') : 'professional presidential news imagery';
  }

  /**
   * Select appropriate image style based on urgency
   */
  private selectImageStyle(urgency: string): 'vivid' | 'natural' {
    // Use 'vivid' for high urgency to make it more dramatic
    // Use 'natural' for lower urgency to keep it professional
    return (urgency === 'critical' || urgency === 'high') ? 'vivid' : 'natural';
  }

  /**
   * Check if news image service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; apiKey: string } {
    return {
      configured: this.isConfigured(),
      apiKey: this.apiKey ? `${this.apiKey.slice(0, 10)}...${this.apiKey.slice(-4)}` : 'NOT SET'
    };
  }
}
