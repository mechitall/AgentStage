import { GameEvent, WorldState, AdvisorMessage, PlayerDecision, GameSession, GameConfig } from '../types';
import { OpenAIService } from '../services/openai.service';
import { WorldStateManager } from '../services/world-state.service';
import { CASCADE_PROBABILITY_MATRIX } from '../config/oval-office.config';

export class GameEngine {
  private readonly openAI: OpenAIService;
  private readonly worldStateManager: WorldStateManager;
  private currentSession: GameSession | null = null;
  private readonly config: GameConfig;
  private readonly eventHistory: GameEvent[] = [];
  private readonly advisorMessages: AdvisorMessage[] = [];
  private currentEventMessages: AdvisorMessage[] = []; // Direct cache for current event messages
  private readonly recentAdvisorResponses: Map<string, string[]> = new Map(); // Track recent responses per advisor
  private readonly recentlySelectedAdvisors: string[] = []; // Track recently selected advisor IDs

  constructor(openAIApiKey: string, config: GameConfig, aiAcousticsApiKey?: string) {
    console.log('🎮 [GameEngine] Initializing game engine...');
    console.log('🎮 [GameEngine] OpenAI API Key provided:', openAIApiKey ? 'YES' : 'NO');
    console.log('🎮 [GameEngine] AI Acoustics API Key provided:', aiAcousticsApiKey ? 'YES' : 'NO');
    console.log('🎮 [GameEngine] Config mode:', config.mode);
    console.log('🎮 [GameEngine] Advisors count:', config.advisors.length);
    console.log('🎮 [GameEngine] Initial world state:', config.initialWorldState);
    
    this.openAI = new OpenAIService(openAIApiKey, aiAcousticsApiKey);
    this.worldStateManager = new WorldStateManager(config.initialWorldState);
    this.config = config;
    
    console.log('🎮 [GameEngine] Game engine initialized successfully');
  }

  /**
   * Start a new game session
   */
  async startSession(playerId: string): Promise<void> {
    console.log('🚀 [GameEngine] Starting new session...');
    console.log('🚀 [GameEngine] Player ID:', playerId);

    // Clear any existing data
    this.advisorMessages.length = 0;
    this.currentEventMessages = [];
    this.eventHistory.length = 0;    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      playerId,
      mode: this.config.mode,
      worldState: this.worldStateManager.getCurrentState(),
      events: [],
      decisions: [],
      pendingCascadeEvents: [],
      currentTurn: 0,
      startTime: new Date(),
    };

    console.log('🚀 [GameEngine] Session created:', this.currentSession.sessionId);    try {
      // Generate the first event
      console.log('🚀 [GameEngine] Generating initial event...');
      const initialEvent = await this.generateNewEvent();
      console.log('🚀 [GameEngine] Initial event generated:', initialEvent.title);
      
      this.currentSession.events.push(initialEvent);
      this.eventHistory.push(initialEvent);

      // Get advisor responses
      console.log('🚀 [GameEngine] Getting advisor responses...');
      const initialResponses = await this.getAdvisorResponses(initialEvent);
      this.currentEventMessages = [...initialResponses]; // Cache initial responses
      console.log('🚀 [GameEngine] Advisor responses received and cached');

      console.log('🚀 [GameEngine] Session started successfully');
    } catch (error) {
      console.error('🚀 [GameEngine] ERROR starting session:', error);
      throw error;
    }
  }

  /**
   * Generate a new event based on current world state
   */
  async generateNewEvent(): Promise<GameEvent> {
    console.log('📅 [GameEngine] Generating new event...');
    const worldState = this.worldStateManager.getCurrentState();
    console.log('📅 [GameEngine] Current world state for event generation:', worldState);
    
    // Check if we have any cascade events ready to trigger
    let eventTitle: string | undefined;
    if (this.currentSession) {
      const eventsToTrigger = this.currentSession.pendingCascadeEvents.filter(
        pe => pe.triggersAtTurn <= this.currentSession!.currentTurn
      );
      
      if (eventsToTrigger.length > 0) {
        // Use the first cascade event as our title hint
        eventTitle = eventsToTrigger[0].eventTitle;
        console.log(`🌊 [GameEngine] Using cascade event as basis: "${eventTitle}"`);
      }
    }
    
    const event = await this.openAI.generateEvent(worldState, this.eventHistory, eventTitle);
    console.log('📅 [GameEngine] New event generated:', event);
    return event;
  }

  /**
   * Get responses from randomly selected advisors for an event (3 out of all available)
   */
  async getAdvisorResponses(event: GameEvent): Promise<AdvisorMessage[]> {
    console.log('👥 [GameEngine] Getting advisor responses...');
    console.log('👥 [GameEngine] Event:', event.title);
    console.log('👥 [GameEngine] Event ID:', event.id);
    console.log('👥 [GameEngine] Total advisors available:', this.config.advisors.length);
    
    // Always generate fresh responses - no caching to ensure unique responses each turn
    console.log('👥 [GameEngine] Generating fresh advisor responses for this event');
    
    // Randomly select 3 advisors from all available advisors
    console.log('🎲 [GameEngine] BEFORE selection - Available advisor names:', this.config.advisors.map(a => a.name));
    const selectedAdvisors = this.selectRandomAdvisors(this.config.advisors, 3);
    console.log(`👥 [GameEngine] AFTER selection - Selected advisors for this turn:`, selectedAdvisors.map(a => `${a.name} (${a.id})`));
    console.log(`👥 [GameEngine] Selection timestamp: ${new Date().toISOString()}`);
    
    const worldState = this.worldStateManager.getCurrentState();
    const responses: AdvisorMessage[] = [];

    for (const advisor of selectedAdvisors) {
      console.log(`👤 [GameEngine] Getting response from ${advisor.name} (${advisor.role})...`);
      try {
        // Get recent responses for this advisor to avoid repetition
        const recentResponses = this.recentAdvisorResponses.get(advisor.id) || [];
        
        const response = await this.openAI.generateAdvisorResponseWithHistory(
          advisor, 
          event, 
          worldState, 
          recentResponses
        );
        console.log(`👤 [GameEngine] Response from ${advisor.name}:`, response.content);
        
        // Track this response
        this.trackAdvisorResponse(advisor.id, response.content);
        
        responses.push(response);
        this.advisorMessages.push(response);
      } catch (error) {
        console.error(`👤 [GameEngine] ERROR getting response from ${advisor.name}:`, error);
        // Continue with other advisors even if one fails
      }
    }

    console.log(`👥 [GameEngine] Collected ${responses.length} advisor responses`);
    return responses;
  }

  /**
   * Randomly select a specified number of advisors with preference for those not recently used
   */
  private selectRandomAdvisors(advisors: any[], count: number): any[] {
    if (advisors.length <= count) {
      // If we have fewer advisors than requested, return all of them
      return [...advisors];
    }

    // Separate advisors into recently used and not recently used
    const recentlyUsedIds = this.recentlySelectedAdvisors.slice(-6); // Last 6 selections
    const notRecentlyUsed = advisors.filter(a => !recentlyUsedIds.includes(a.id));
    const recentlyUsed = advisors.filter(a => recentlyUsedIds.includes(a.id));

    console.log(`🎲 [GameEngine] Recently used advisors: ${recentlyUsedIds.join(', ')}`);
    console.log(`🎲 [GameEngine] Available not recently used: ${notRecentlyUsed.map(a => a.name).join(', ')}`);

    // Create weighted selection - prefer advisors not recently used
    let availableAdvisors: any[] = [];
    
    if (notRecentlyUsed.length >= count) {
      // We have enough advisors that weren't recently used
      availableAdvisors = [...notRecentlyUsed];
    } else {
      // Use all not recently used, plus some recently used
      availableAdvisors = [...notRecentlyUsed, ...recentlyUsed];
    }

    // Shuffle the available advisors
    const shuffled = [...availableAdvisors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return the first 'count' advisors from the shuffled array
    const selected = shuffled.slice(0, count);
    
    // Track these selections
    for (const advisor of selected) {
      this.recentlySelectedAdvisors.push(advisor.id);
    }
    
    // Keep only the last 12 selections to prevent memory bloat
    if (this.recentlySelectedAdvisors.length > 12) {
      this.recentlySelectedAdvisors.splice(0, this.recentlySelectedAdvisors.length - 12);
    }
    
    console.log(`🎲 [GameEngine] Selected ${selected.length} advisors: ${selected.map(a => a.name).join(', ')}`);
    return selected;
  }

  /**
   * Track advisor responses to prevent repetition
   */
  private trackAdvisorResponse(advisorId: string, response: string): void {
    if (!this.recentAdvisorResponses.has(advisorId)) {
      this.recentAdvisorResponses.set(advisorId, []);
    }
    
    const responses = this.recentAdvisorResponses.get(advisorId)!;
    responses.push(response);
    
    // Keep only the last 3 responses to avoid memory bloat
    if (responses.length > 3) {
      responses.shift();
    }
    
    console.log(`📝 [GameEngine] Tracked response for ${advisorId}. Recent responses count: ${responses.length}`);
  }

  /**
   * Get advisor reactions to a player decision (randomly selected 3 advisors)
   */
  async getAdvisorReactions(decision: PlayerDecision, event: GameEvent, consequence: any): Promise<AdvisorMessage[]> {
    console.log('💬 [GameEngine] Getting advisor reactions to decision...');
    console.log('💬 [GameEngine] Decision action:', decision.action);
    console.log('💬 [GameEngine] Total advisors available:', this.config.advisors.length);
    
    // Randomly select 3 advisors for reactions (might be different from the initial response advisors)
    const selectedAdvisors = this.selectRandomAdvisors(this.config.advisors, 3);
    console.log(`💬 [GameEngine] Selected advisors for reactions:`, selectedAdvisors.map(a => a.name));
    
    const worldState = this.worldStateManager.getCurrentState();
    const reactions: AdvisorMessage[] = [];

    for (const advisor of selectedAdvisors) {
      console.log(`💬 [GameEngine] Getting reaction from ${advisor.name}...`);
      try {
        const reaction = await this.openAI.generateAdvisorReaction(
          advisor, 
          decision, 
          event, 
          consequence, 
          worldState
        );
        console.log(`💬 [GameEngine] Reaction from ${advisor.name}:`, reaction.content);
        reactions.push(reaction);
        this.advisorMessages.push(reaction);
      } catch (error) {
        console.error(`💬 [GameEngine] ERROR getting reaction from ${advisor.name}:`, error);
        // Continue with other advisors even if one fails
      }
    }

    console.log(`💬 [GameEngine] Collected ${reactions.length} advisor reactions`);
    return reactions;
  }

  /**
   * Process player decision
   */
  /**
   * Parse advisor agreement from player input and return actual advisor recommendation
   */
  private parseAdvisorAgreement(action: string, eventId: string): string {
    console.log(`🔍 [GameEngine] Checking advisor agreement in: "${action}"`);
    
    // Patterns to detect advisor agreement
    const agreementPatterns = [
      /I agree with (.*?)(?:\s*\.|\s*,|\s*$|\s+(?:on|about|that))/i,
      /Agree with (.*?)(?:\s*\.|\s*,|\s*$|\s+(?:on|about|that))/i,
      /Follow (.*?)(?:'s|s)?\s*(?:advice|recommendation|suggestion)(?:\s|$|\.)/i,
      /Do what (.*?) (?:said|suggests?|recommends?)(?:\s|$|\.)/i,
      /Let's do what (.*?) (?:said|suggests?|recommends?)(?:\s|$|\.)/i,
      /Go with (.*?)(?:'s|s)?\s*(?:plan|idea|advice|recommendation)?(?:\s|$|\.)/i
    ];

    for (const pattern of agreementPatterns) {
      const match = pattern.exec(action);
      if (match) {
        const advisorReference = match[1].trim().toLowerCase();
        console.log(`🎯 [GameEngine] Found advisor reference: "${advisorReference}"`);
        
        // Map common advisor references to their IDs
        const advisorMapping: { [key: string]: string } = {
          'dj vans': 'chief_staff',
          'vans': 'chief_staff',
          'dj': 'chief_staff',
          'general jake sullivan-peters': 'national_security',
          'general': 'national_security',
          'sullivan-peters': 'national_security',
          'jake': 'national_security',
          'ilon tusk': 'tech_advisor',
          'ilon': 'tech_advisor',
          'tusk': 'tech_advisor',
          'kellyanne conway-smith': 'counselor',
          'kellyanne': 'counselor',
          'conway-smith': 'counselor',
          'conway': 'counselor'
        };

        const advisorId = advisorMapping[advisorReference];
        console.log(`🔍 [GameEngine] Mapped "${advisorReference}" to advisorId: ${advisorId}`);
        
        if (advisorId) {
          // Find the advisor's message for this event
          const advisorMessage = this.advisorMessages.find(
            m => m.eventId === eventId && m.advisorId === advisorId && !m.isReaction
          );
          
          if (advisorMessage) {
            console.log(`🎯 [GameEngine] Player agreed with ${advisorId}, using: "${advisorMessage.content}"`);
            return advisorMessage.content;
          }
        }
      }
    }
    
    return action; // Return original action if no agreement pattern found
  }

  async processDecision(eventId: string, action: string, reasoning?: string): Promise<{
    consequence: any;
    newWorldState: WorldState;
    nextEvent?: GameEvent;
    advisorReactions?: any;
  }> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    // Try to find the event in eventHistory first, then fall back to current event
    let event = this.eventHistory.find(e => e.id === eventId);
    if (!event) {
      // If event not found by ID, always use the current event as fallback
      const currentEvent = this.getCurrentEvent();
      if (currentEvent) {
        event = currentEvent;
        console.log(`⚠️ [GameEngine] Event ${eventId} not found, using current event: ${currentEvent.id}`);
      } else {
        console.error(`❌ [GameEngine] No current event available and event not found: ${eventId}`);
        console.log(`📋 [GameEngine] Available events:`, this.eventHistory.map(e => ({ id: e.id, title: e.title })));
        throw new Error(`No active event found`);
      }
    }

    // Parse advisor agreement and replace action if needed
    const processedAction = this.parseAdvisorAgreement(action, eventId);

    const decision: PlayerDecision = {
      eventId,
      action: processedAction,
      reasoning,
      consultedAdvisors: this.advisorMessages
        .filter(m => m.eventId === eventId)
        .map(m => m.advisorId),
      timestamp: new Date(),
    };

    this.currentSession.decisions.push(decision);

    // Get advisor messages for context - only messages for the current event
    const currentAdvisorMessages = this.advisorMessages
      .filter(m => m.eventId === event.id && !m.isReaction)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Evaluate consequences with advisor context
    const consequence = await this.openAI.evaluateDecision(
      decision,
      event,
      this.worldStateManager.getCurrentState(),
      currentAdvisorMessages
    );

    // Apply consequences to world state
    const newWorldState = this.worldStateManager.applyConsequence(consequence);

    // Handle cascade events - use both AI-suggested and smart matrix-based cascades
    if (consequence.cascadeEvents && consequence.cascadeEvents.length > 0) {
      // Calculate impact level based on parameter changes
      const paramChanges = consequence.impact.parameterChanges || {};
      const totalImpact = Object.values(paramChanges).reduce((sum, val) => {
        return (sum || 0) + Math.abs(val as number);
      }, 0) || 0;
      
      console.log(`🎲 [GameEngine] Processing cascades with impact level: ${totalImpact}`);
      
      // Combine AI-suggested cascades with smart matrix-based cascades
      const aiSuggestedCascades = consequence.cascadeEvents;
      const smartCascades = this.generateSmartCascadeEvents(event.title, totalImpact);
      const allPotentialCascades = [...aiSuggestedCascades, ...smartCascades];
      
      // Remove duplicates
      const uniqueCascades = Array.from(new Set(allPotentialCascades));
      console.log(`🌊 [GameEngine] Found ${uniqueCascades.length} potential cascade events: ${uniqueCascades.join(', ')}`);
      
      // Determine base probability based on impact level - REDUCED for more randomness
      let baseCascadeProbability = 0;
      if (totalImpact > 200) {
        baseCascadeProbability = 0.4; // Very high impact - 40% base chance (was 80%)
      } else if (totalImpact > 100) {
        baseCascadeProbability = 0.25; // High impact - 25% base chance (was 60%)
      } else if (totalImpact > 50) {
        baseCascadeProbability = 0.15; // Medium impact - 15% base chance (was 40%)
      } else if (totalImpact > 20) {
        baseCascadeProbability = 0.08; // Low impact - 8% base chance (was 25%)
      } else {
        baseCascadeProbability = 0.03; // Very low impact - 3% base chance (was 10%)
      }
      
      for (const eventTitle of uniqueCascades) {
        // Smart cascades have slightly higher probability than AI-suggested ones
        const isSmartCascade = smartCascades.includes(eventTitle);
        const cascadeProbability = isSmartCascade ? baseCascadeProbability * 1.1 : baseCascadeProbability;
        
        const shouldCascade = Math.random() < Math.min(0.6, cascadeProbability); // Max 60% chance (was 95%)
        
        if (shouldCascade) {
          const turnsToWait = Math.floor(Math.random() * 5) + 2; // 2-6 turns (was 1-3)
          const targetTurn = this.currentSession.currentTurn + turnsToWait;
          
          this.currentSession.pendingCascadeEvents.push({
            eventTitle,
            triggersAtTurn: targetTurn
          });
          console.log(`⏰ [GameEngine] Scheduled cascade event "${eventTitle}" for turn ${targetTurn} (${(cascadeProbability * 100).toFixed(0)}% chance triggered)`);
        } else {
          console.log(`❌ [GameEngine] Cascade event "${eventTitle}" did not trigger (${(cascadeProbability * 100).toFixed(0)}% chance)`);
        }
      }
    }

    // Increment turn counter
    this.currentSession.currentTurn++;

    // Check for any cascade events that should trigger now
    const eventsToTrigger = this.currentSession.pendingCascadeEvents.filter(
      pe => pe.triggersAtTurn <= this.currentSession!.currentTurn
    );
    
    if (eventsToTrigger.length > 0) {
      console.log(`🌊 [GameEngine] Triggering ${eventsToTrigger.length} cascade events at turn ${this.currentSession.currentTurn}`);
      // Remove triggered events from pending list
      this.currentSession.pendingCascadeEvents = this.currentSession.pendingCascadeEvents.filter(
        pe => pe.triggersAtTurn > this.currentSession!.currentTurn
      );
    }

    // Generate advisor reactions to the decision
    console.log('👥 [GameEngine] Getting advisor reactions to decision...');
    const advisorReactions = await this.getAdvisorReactions(decision, event, consequence);

    // Check if we need to generate a new event
    const shouldGenerateNewEvent = this.shouldGenerateNewEvent();
    let nextEvent: GameEvent | undefined;

    if (shouldGenerateNewEvent) {
      console.log('📅 [GameEngine] Generating new event after decision...');
      console.log('📅 [GameEngine] ⚡ CRITICAL: About to generate a completely new event!');
      nextEvent = await this.generateNewEvent();
      console.log('📅 [GameEngine] ✅ NEW EVENT GENERATED:', {
        id: nextEvent.id,
        title: nextEvent.title,
        timestamp: new Date().toISOString()
      });
      this.currentSession.events.push(nextEvent);
      this.eventHistory.push(nextEvent);
      
      // Clear any old messages when moving to a new event
      console.log('🧹 [GameEngine] Clearing old messages for new event');
      const oldMessageCount = this.advisorMessages.length;
      console.log(`🧹 [GameEngine] Before cleanup - total messages: ${oldMessageCount}`);
      
      // Clear ALL messages when moving to a new event to avoid confusion
      this.advisorMessages.length = 0;
      this.currentEventMessages = []; // Clear current event messages cache
      console.log('🧹 [GameEngine] Cleared ALL advisor messages for fresh start');
      
      // Keep only messages for events that are still in the current session
      const currentEventIds = this.currentSession.events.map(e => e.id);
      console.log(`🧹 [GameEngine] Current event IDs in session: ${currentEventIds.join(', ')}`);
      
      console.log(`🧹 [GameEngine] Removed all ${oldMessageCount} old messages for clean slate`);
      
      // Get advisor responses for the new event
      console.log('👥 [GameEngine] Getting advisor responses for new event:', nextEvent.title);
      console.log('👥 [GameEngine] New event ID:', nextEvent.id);
      try {
        console.log('🔄 [GameEngine] STARTING advisor response generation for new event...');
        const newEventAdvisorResponses = await this.getAdvisorResponses(nextEvent);
        this.currentEventMessages = [...newEventAdvisorResponses]; // Cache the responses directly
        console.log(`✅ [GameEngine] Successfully generated ${newEventAdvisorResponses.length} advisor responses for new event`);
        console.log('👤 [GameEngine] New event advisors:', newEventAdvisorResponses.map(r => `${r.advisorId}: "${r.content.substring(0, 50)}..."`));
        console.log('🔍 [GameEngine] Current advisor messages count after generation:', this.advisorMessages.length);
        console.log('🔍 [GameEngine] Current event messages cache count:', this.currentEventMessages.length);
        console.log('🔍 [GameEngine] Cached advisor IDs:', this.currentEventMessages.map(m => m.advisorId).join(', '));
        if (nextEvent) {
          console.log('🔍 [GameEngine] Advisor messages for new event:', this.advisorMessages.filter(m => m.eventId === nextEvent!.id).length);
        }
      } catch (error) {
        console.error('❌ [GameEngine] ERROR generating advisor responses for new event:', error);
        console.error('❌ [GameEngine] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Re-throw the error so we know something went wrong
        throw new Error(`Failed to generate advisor responses for new event: ${error}`);
      }
    } else {
      console.log('📅 [GameEngine] ❌ NOT generating new event - conditions not met');
      console.log('📅 [GameEngine] This means same advisors/responses will be shown!');
    }

    return {
      consequence,
      newWorldState,
      nextEvent,
      advisorReactions,
    };
  }

  /**
   * Ask a follow-up question to a specific advisor
   */
  async askAdvisor(advisorId: string, question: string, eventId: string): Promise<AdvisorMessage> {
    const advisor = this.config.advisors.find(a => a.id === advisorId);
    if (!advisor) {
      throw new Error('Advisor not found');
    }

    const event = this.eventHistory.find(e => e.id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const previousMessages = this.advisorMessages.filter(m => 
      m.advisorId === advisorId && m.eventId === eventId
    );

    const response = await this.openAI.generateAdvisorFollowUp(advisor, question, {
      event,
      worldState: this.worldStateManager.getCurrentState(),
      previousMessages,
    });

    this.advisorMessages.push(response);
    return response;
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      session: this.currentSession,
      worldState: this.worldStateManager.getCurrentState(),
      worldStateReport: this.worldStateManager.getStateReport(),
      currentEvent: this.getCurrentEvent(),
      availableAdvisors: this.config.advisors.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        expertise: a.expertise,
      })),
      recentMessages: this.getRecentAdvisorMessages(),
      recentReactions: this.getRecentAdvisorReactions(),
    };
  }

  /**
   * Get the current active event
   */
  getCurrentEvent(): GameEvent | null {
    if (!this.currentSession || this.currentSession.events.length === 0) {
      console.log('🔍 [GameEngine] getCurrentEvent - No session or no events');
      return null;
    }
    const currentEvent = this.currentSession.events[this.currentSession.events.length - 1];
    console.log(`🔍 [GameEngine] getCurrentEvent - Returning event: ${currentEvent.id} (${currentEvent.title})`);
    return currentEvent;
  }

  /**
   * Get recent advisor messages for the current event
   */
  getRecentAdvisorMessages(): AdvisorMessage[] {
    const currentEvent = this.getCurrentEvent();
    if (!currentEvent) {
      console.log('🔍 [GameEngine] No current event for getRecentAdvisorMessages');
      return [];
    }

    console.log(`🔍 [GameEngine] getRecentAdvisorMessages called!`);
    console.log(`🔍 [GameEngine] Current event ID: ${currentEvent.id}`);
    console.log(`🔍 [GameEngine] Current event title: ${currentEvent.title}`);
    console.log(`🔍 [GameEngine] Total advisor messages: ${this.advisorMessages.length}`);
    console.log(`🔍 [GameEngine] Current event messages cache: ${this.currentEventMessages.length}`);
    console.log(`🔍 [GameEngine] All message event IDs:`, [...new Set(this.advisorMessages.map(m => m.eventId))]);
    
    // Show cache contents
    if (this.currentEventMessages.length > 0) {
      console.log(`🔍 [GameEngine] Cache contents:`, this.currentEventMessages.map(m => ({
        advisorId: m.advisorId,
        eventId: m.eventId,
        content: m.content.substring(0, 30) + '...'
      })));
    }

    // Use cached messages if available and they match the current event
    if (this.currentEventMessages.length > 0 && 
        this.currentEventMessages.every(m => m.eventId === currentEvent.id)) {
      console.log('🔍 [GameEngine] ✅ Using cached current event messages');
      const sortedMessages = this.currentEventMessages
        .filter(m => !m.isReaction) // Exclude reaction messages
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      console.log(`🔍 [GameEngine] Returning ${sortedMessages.length} cached messages`);
      console.log(`🔍 [GameEngine] Cached advisor IDs: ${sortedMessages.map(m => m.advisorId).join(', ')}`);
      return sortedMessages;
    }

    // Fall back to filtering from all messages
    console.log('🔍 [GameEngine] ❌ Cache miss, filtering from all messages');
    const filteredMessages = this.advisorMessages
      .filter(m => m.eventId === currentEvent.id)
      .filter(m => !m.isReaction) // Exclude reaction messages
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    console.log(`🔍 [GameEngine] Filtered messages for current event: ${filteredMessages.length}`);
    console.log(`🔍 [GameEngine] Filtered advisor IDs: ${filteredMessages.map(m => m.advisorId).join(', ')}`);
    
    return filteredMessages;
  }

  /**
   * Get advisor reactions for the most recent decision
   */
  getRecentAdvisorReactions(): AdvisorMessage[] {
    const currentEvent = this.getCurrentEvent();
    if (!currentEvent) return [];

    // Get only reaction messages for the current event
    return this.advisorMessages
      .filter(m => m.eventId === currentEvent.id)
      .filter(m => m.isReaction === true)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate cascade events based on the current event and probability matrix
   */
  private generateSmartCascadeEvents(currentEventTitle: string, impactLevel: number): string[] {
    const cascadeEvents: string[] = [];
    const eventKey = currentEventTitle.toLowerCase().replace(/\s+/g, '_');
    
    // Check if we have defined cascades for this event type
    const possibleCascades = (CASCADE_PROBABILITY_MATRIX as any)[eventKey];
    if (possibleCascades) {
      for (const [cascadeEvent, baseProbability] of Object.entries(possibleCascades)) {
        // Adjust probability based on impact level
        let adjustedProbability = baseProbability as number;
        if (impactLevel > 150) {
          adjustedProbability *= 1.3; // High impact increases cascade chance
        } else if (impactLevel > 100) {
          adjustedProbability *= 1.1;
        } else if (impactLevel < 50) {
          adjustedProbability *= 0.7; // Low impact decreases cascade chance
        }
        
        if (Math.random() < adjustedProbability) {
          cascadeEvents.push(cascadeEvent);
          console.log(`🌊 [GameEngine] Smart cascade triggered: ${cascadeEvent} (${(adjustedProbability * 100).toFixed(0)}% chance)`);
        }
      }
    }
    
    // If no smart cascades, fall back to random generation for high-impact events
    if (cascadeEvents.length === 0 && impactLevel > 150) { // Increased threshold from 100 to 150
      const fallbackEvents = [
        'media_firestorm', 'congressional_investigation', 'public_protest',
        'international_condemnation', 'economic_aftershock', 'political_fallout'
      ];
      const randomEvent = fallbackEvents[Math.floor(Math.random() * fallbackEvents.length)];
      if (Math.random() < 0.15) { // Reduced from 40% to 15% chance for fallback cascade
        cascadeEvents.push(randomEvent);
        console.log(`🌊 [GameEngine] Fallback cascade triggered: ${randomEvent}`);
      }
    }
    
    return cascadeEvents;
  }

  /**
   * Determine if a new event should be generated
   */
  private shouldGenerateNewEvent(): boolean {
    // TEMPORARY FIX: Always generate new events to test advisor rotation
    console.log('🎲 [GameEngine] FORCING new event generation for testing');
    return true;
    
    /* Original logic - commented out for testing
    // Generate new event based on various factors - REDUCED for more randomness
    const criticalParams = this.worldStateManager.getCriticalParameters();
    const stability = this.worldStateManager.getStabilityScore();
    
    // More likely to generate events if:
    // - There are critical parameters
    // - Stability is low
    // - Random chance based on difficulty
    
    const baseChance = 0.45; // Reduced from 70% to 45% base chance
    const criticalBonus = criticalParams.length * 0.08; // Reduced from +10% to +8% per critical param
    const stabilityPenalty = (100 - stability) * 0.0015; // Reduced multiplier
    
    const difficultyMultiplier = {
      easy: 0.7,      // was 0.8
      normal: 0.85,   // was 1.0  
      hard: 1.0,      // was 1.2
      nightmare: 1.15, // was 1.5
    }[this.config.difficultyLevel];
    
    const finalChance = (baseChance + criticalBonus + stabilityPenalty) * difficultyMultiplier;
    
    console.log(`🎲 [GameEngine] Event generation chance: ${(finalChance * 100).toFixed(1)}% (base: ${baseChance}, critical: ${criticalBonus.toFixed(2)}, stability: ${stabilityPenalty.toFixed(3)}, difficulty: ${difficultyMultiplier})`);
    
    return Math.random() < Math.min(0.65, finalChance); // Reduced max from 90% to 65%
    */
  }  /**
   * End the current session
   */
  endSession(): GameSession | null {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      const session = this.currentSession;
      this.currentSession = null;
      return session;
    }
    return null;
  }

  /**
   * Get game analytics
   */
  getAnalytics() {
    if (!this.currentSession) {
      return null;
    }

    const sessionDuration = Date.now() - this.currentSession.startTime.getTime();
    const decisions = this.currentSession.decisions.length;
    const events = this.currentSession.events.length;
    const stateHistory = this.worldStateManager.getStateHistory();

    return {
      sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
      decisionsCount: decisions,
      eventsCount: events,
      averageDecisionTime: decisions > 0 ? sessionDuration / decisions : 0,
      worldStateHistory: stateHistory,
      finalStability: this.worldStateManager.getStabilityScore(),
      criticalParameters: this.worldStateManager.getCriticalParameters(),
    };
  }
}
