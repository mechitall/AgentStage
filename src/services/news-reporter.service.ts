import { NewsImageService } from './sora.service';
import { OpenAIService } from './openai.service';
import { GameEvent, WorldState, PlayerDecision } from '../types';

interface NewsContext {
  event: GameEvent;
  worldState: WorldState;
  decision?: PlayerDecision;
  consequence?: any;
  sessionTurn: number;
}

interface NewsImage {
  id: string;
  script: string;
  imageUrl: string;
  timestamp: Date;
  context: NewsContext;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class NewsReporterService {
  private readonly newsImageService: NewsImageService;
  private readonly openAIService: OpenAIService;
  private readonly newsImages: NewsImage[] = [];
  private readonly processingQueue: NewsContext[] = [];
  private isProcessing = false;

  constructor(openAIService: OpenAIService) {
    this.newsImageService = new NewsImageService();
    this.openAIService = openAIService;
    
    console.log('📺 [NewsReporter] Service initialized');
    console.log('🖼️ [NewsReporter] Image generation configured:', this.newsImageService.isConfigured());
  }

  /**
   * Queue a news report for generation based on game context
   */
  async queueNewsReport(context: NewsContext): Promise<void> {
    console.log(`📺 [NewsReporter] Queuing news report for event: ${context.event.title}`);
    
    this.processingQueue.push(context);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the news generation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`📺 [NewsReporter] Processing queue with ${this.processingQueue.length} items`);

    try {
      while (this.processingQueue.length > 0) {
        const context = this.processingQueue.shift();
        if (context) {
          console.log(`📺 [NewsReporter] Processing news for: ${context.event.title}`);
          
          const newsImage = await this.generateNewsReport(context);
          if (newsImage) {
            this.newsImages.push(newsImage);
            console.log(`✅ [NewsReporter] Generated news image: ${newsImage.id}`);
          }
          
          // Small delay between generations to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('❌ [NewsReporter] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      console.log(`📺 [NewsReporter] Queue processing complete. Generated ${this.newsImages.length} total images.`);
    }
  }

  /**
   * Generate a news report image based on context
   */
  private async generateNewsReport(context: NewsContext): Promise<NewsImage | null> {
    try {
      console.log(`📺 [NewsReporter] Generating news script for context:`, {
        eventTitle: context.event.title,
        sessionTurn: context.sessionTurn,
        hasDecision: !!context.decision,
        hasConsequence: !!context.consequence
      });

      // Generate news script using OpenAI
      const script = await this.openAIService.generateNewsScript(context);
      if (!script) {
        console.error('❌ [NewsReporter] Failed to generate news script');
        return null;
      }

      console.log(`📺 [NewsReporter] Generated script: "${script.substring(0, 100)}..."`);
      
      // Determine urgency based on context
      const urgency = this.determineUrgency(context);
      console.log(`📺 [NewsReporter] Determined urgency level: ${urgency}`);

      console.log(`🖼️ [NewsReporter] Generating news image for context:`, context);

      if (!this.newsImageService.isConfigured()) {
        console.warn('⚠️ [NewsReporter] Image service not configured, skipping image generation');
        return null;
      }

      const imageUrl = await this.newsImageService.generateNewsImage(script, {
        urgency,
        worldState: context.worldState,
        eventTitle: context.event.title
      });

      if (!imageUrl) {
        console.error('❌ [NewsReporter] Failed to generate news image');
        return null;
      }

      const newsImage: NewsImage = {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        script,
        imageUrl,
        timestamp: new Date(),
        context,
        urgency
      };

      console.log(`✅ [NewsReporter] News image generated successfully: ${newsImage.id}`);
      return newsImage;

    } catch (error) {
      console.error('❌ [NewsReporter] Error generating news report:', error);
      return null;
    }
  }

  /**
   * Determine news urgency based on context
   */
  private determineUrgency(context: NewsContext): 'low' | 'medium' | 'high' | 'critical' {
    // Check for critical keywords in event title
    const title = context.event.title.toLowerCase();
    const description = context.event.description.toLowerCase();
    
    const criticalKeywords = ['nuclear', 'war', 'invasion', 'attack', 'crisis', 'emergency', 'catastrophe'];
    const highKeywords = ['military', 'security', 'breach', 'threat', 'urgent', 'breaking'];
    const mediumKeywords = ['economic', 'diplomatic', 'policy', 'summit', 'meeting'];
    
    // Check for critical situations
    if (criticalKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return 'critical';
    }
    
    // Check for high priority
    if (highKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return 'high';
    }
    
    // Check for medium priority
    if (mediumKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return 'medium';
    }
    
    // Check world state impact
    if (context.worldState) {
      const avgState = (
        context.worldState.economy + 
        context.worldState.military + 
        context.worldState.diplomacy + 
        context.worldState.environment + 
        context.worldState.healthcare + 
        context.worldState.education + 
        context.worldState.publicTrust + 
        context.worldState.globalStanding
      ) / 8;
      
      if (avgState < 30) return 'critical';
      if (avgState < 50) return 'high';
      if (avgState < 70) return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get recent news images
   */
  getRecentNewsImages(limit: number = 5): NewsImage[] {
    return this.newsImages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get news image by ID
   */
  getNewsImage(id: string): NewsImage | null {
    return this.newsImages.find(image => image.id === id) || null;
  }

  /**
   * Get all completed news images (for compatibility with existing API)
   */
  getCompletedVideos(): NewsImage[] {
    return this.newsImages.filter(image => image.imageUrl);
  }

  /**
   * Check if service is configured and ready
   */
  isReady(): boolean {
    return this.newsImageService.isConfigured();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ready: this.isReady(),
      imageServiceStatus: this.newsImageService.getStatus(),
      imagesGenerated: this.newsImages.length,
      queueLength: this.processingQueue.length,
      processing: this.isProcessing
    };
  }
}
