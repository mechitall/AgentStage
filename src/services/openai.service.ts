import OpenAI from 'openai';
import { GameEvent, WorldState, Advisor, AdvisorMessage, Consequence, PlayerDecision, ACIToolDefinition, ToolCallResult } from '../types';
import { TTSService } from './tts.service';
import ACIService from './aci.service';
import { EVENT_TOPIC_POOLS } from '../config/oval-office.config';

export class OpenAIService {
  private readonly client: OpenAI;
  private readonly ttsService?: TTSService;
  private readonly aciService: ACIService;

  constructor(apiKey: string, aiAcousticsApiKey?: string) {
    console.log('🤖 [OpenAI] Initializing OpenAI service...');
    console.log('🤖 [OpenAI] API Key provided:', apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : 'NOT PROVIDED');
    this.client = new OpenAI({ apiKey });
    this.aciService = new ACIService();
    
    // Initialize TTS service if we have API keys
    if (apiKey) {
      try {
        this.ttsService = new TTSService({
          openaiApiKey: apiKey,
          aiAcousticsApiKey
        });
        console.log('🎤 [OpenAI] TTS service initialized');
      } catch (error) {
        console.warn('⚠️ [OpenAI] TTS service initialization failed:', error);
      }
    }
    
    console.log('🤖 [OpenAI] OpenAI client initialized successfully');
    console.log('🛠️ [ACI] Tool calling service initialized:', this.aciService.isConfigured() ? 'CONFIGURED' : 'NOT CONFIGURED');
  }

  /**
   * Select event topics based on world state and randomization
   */
  private selectEventTopics(worldState: WorldState, cascadeEventTitle?: string): string[] {
    if (cascadeEventTitle) {
      console.log(`🎲 [OpenAI] Using cascade event title: ${cascadeEventTitle}`);
      return [cascadeEventTitle];
    }

    const criticalParameters = this.getCriticalParameters(worldState);
    const topicPools = [];
    
    // Weight topic pools based on world state
    if (criticalParameters.includes('publicTrust') || criticalParameters.includes('domesticStability')) {
      topicPools.push({ pool: EVENT_TOPIC_POOLS.crisis, weight: 0.4 });
      topicPools.push({ pool: EVENT_TOPIC_POOLS.political, weight: 0.3 });
    }
    
    if (criticalParameters.includes('globalReputation') || criticalParameters.includes('military')) {
      topicPools.push({ pool: EVENT_TOPIC_POOLS.international, weight: 0.3 });
    }
    
    if (criticalParameters.includes('economy')) {
      topicPools.push({ pool: EVENT_TOPIC_POOLS.economic, weight: 0.4 });
    }
    
    if (criticalParameters.includes('environmentalHealth')) {
      topicPools.push({ pool: EVENT_TOPIC_POOLS.environmental, weight: 0.2 });
    }
    
    // Always include some baseline pools
    topicPools.push({ pool: EVENT_TOPIC_POOLS.social, weight: 0.2 });
    topicPools.push({ pool: EVENT_TOPIC_POOLS.technology, weight: 0.15 });
    
    // Randomly select 2-3 topics from weighted pools
    const selectedTopics: string[] = [];
    const numTopics = Math.random() < 0.3 ? 3 : 2; // 30% chance for 3 topics, 70% for 2
    
    for (let i = 0; i < numTopics; i++) {
      const selectedPool = this.weightedRandomSelect(topicPools);
      if (selectedPool && selectedPool.length > 0) {
        const randomTopic = selectedPool[Math.floor(Math.random() * selectedPool.length)];
        if (!selectedTopics.includes(randomTopic)) {
          selectedTopics.push(randomTopic);
        }
      }
    }
    
    console.log(`🎲 [OpenAI] Selected event topics: ${selectedTopics.join(', ')}`);
    return selectedTopics;
  }

  /**
   * Get unique role reminder for each advisor to ensure distinct responses
   */
  private getAdvisorRoleReminder(advisor: Advisor): string {
    const roleReminders: { [key: string]: string } = {
      'chief_staff': 'You obsess over media coverage, viral moments, and political optics. Everything is about winning news cycles and energizing the base.',
      'national_security': 'You see every crisis through a military lens. Your solutions involve force, deterrence, and showing American strength globally.',
      'tech_advisor': 'You believe technology can solve any problem. Push for innovation, disruption, and cutting-edge solutions that sound futuristic.',
      'counselor': 'You are the spin master. Your job is damage control, alternative narratives, and making any decision look good to voters.',
      'economic_advisor': 'You analyze everything through market impacts, GDP growth, and fiscal responsibility. Corporate interests and economic stability come first.',
      'healthcare_advisor': 'You prioritize public health evidence and medical science above all political considerations. You speak with clinical authority.',
      'environmental_advisor': 'You see climate change as an existential crisis requiring immediate radical action, even if it disrupts the economy.',
      'intelligence_advisor': 'You see security threats everywhere and prefer covert, secretive solutions. You advocate for expanded surveillance and intelligence operations.'
    };
    
    return roleReminders[advisor.id] || `Focus on your unique expertise: ${advisor.expertise[0]}`;
  }

  /**
   * Get event-specific context based on advisor's role and the particular event
   */
  private getEventSpecificRoleContext(advisor: Advisor, event: GameEvent, worldState: WorldState): string {
    const eventTitle = event.title.toLowerCase();
    const eventDesc = event.description.toLowerCase();
    
    // Analyze what this specific event means to each advisor type
    const contexts: { [key: string]: string } = {
      'chief_staff': this.getChiefStaffEventContext(eventTitle, eventDesc, worldState),
      'national_security': this.getSecurityEventContext(eventTitle, eventDesc, worldState),
      'tech_advisor': this.getTechEventContext(eventTitle, eventDesc, worldState),
      'counselor': this.getCounselorEventContext(eventTitle, eventDesc, worldState),
      'economic_advisor': this.getEconomicEventContext(eventTitle, eventDesc, worldState),
      'healthcare_advisor': this.getHealthcareEventContext(eventTitle, eventDesc, worldState),
      'environmental_advisor': this.getEnvironmentalEventContext(eventTitle, eventDesc, worldState),
      'intelligence_advisor': this.getIntelligenceEventContext(eventTitle, eventDesc, worldState)
    };
    
    return contexts[advisor.id] || `As ${advisor.role}, focus on how this event impacts ${advisor.expertise[0]}.`;
  }

  private getChiefStaffEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('scandal') || title.includes('controversy')) {
      return 'This is a PR nightmare! Focus on damage control and changing the narrative fast.';
    }
    if (title.includes('protest') || title.includes('unrest')) {
      return 'Perfect opportunity to mobilize the base. Frame this as us vs. them.';
    }
    if (worldState.publicTrust < 40) {
      return 'Public trust is tanking. We need a viral moment to distract and energize supporters.';
    }
    return 'Think viral content. How do we spin this to dominate the news cycle?';
  }

  private getSecurityEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('attack') || title.includes('threat')) {
      return 'Clear security threat. Military response shows strength and deters future attacks.';
    }
    if (title.includes('cyber') || title.includes('hack')) {
      return 'Cyberwarfare demands immediate retaliation. We cannot appear weak.';
    }
    if (worldState.military < 50) {
      return 'Our military readiness is compromised. This event proves we need more defense spending.';
    }
    return 'Every crisis has security implications. Recommend force projection and deterrence.';
  }

  private getTechEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('ai') || title.includes('tech') || title.includes('cyber')) {
      return 'This validates everything I\'ve said about technology. Time for massive tech investment.';
    }
    if (title.includes('climate') || title.includes('environment')) {
      return 'Technology will solve this faster than regulation. Electric vehicles, solar, innovation!';
    }
    if (worldState.technologicalAdvancement < 60) {
      return 'We\'re falling behind in the tech race. This crisis proves we need disruption now.';
    }
    return 'Every problem has a technological solution. Think innovation, automation, future.';
  }

  private getCounselorEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('investigation') || title.includes('scandal')) {
      return 'Pure witch hunt! Frame this as politically motivated attack on democracy.';
    }
    if (title.includes('economy') || title.includes('jobs')) {
      return 'Blame the previous administration. Our policies are already working, just need time.';
    }
    if (worldState.publicTrust < 45) {
      return 'Trust issues require alternative facts. Reframe the narrative completely.';
    }
    return 'This is about optics and spin. How do we make this look like a presidential victory?';
  }

  private getEconomicEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('market') || title.includes('economy') || title.includes('trade')) {
      return 'Market implications are severe. Focus on GDP impact and corporate confidence.';
    }
    if (title.includes('jobs') || title.includes('unemployment')) {
      return 'Employment data drives everything. This affects quarterly projections significantly.';
    }
    if (worldState.economy < 50) {
      return 'Economic indicators are declining. This event could trigger broader recession.';
    }
    return 'Analyze the fiscal impact. What does this mean for markets and business confidence?';
  }

  private getHealthcareEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('health') || title.includes('medical') || title.includes('virus')) {
      return 'Public health emergency requires evidence-based response, not political calculations.';
    }
    if (title.includes('environment') || title.includes('pollution')) {
      return 'Environmental health directly impacts population wellness. Medical evidence is clear.';
    }
    if (title.includes('crisis') || title.includes('disaster')) {
      return 'Medical preparedness is crucial. Focus on healthcare system capacity and response.';
    }
    return 'From medical perspective, what are the health implications and evidence-based solutions?';
  }

  private getEnvironmentalEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('climate') || title.includes('environment') || title.includes('pollution')) {
      return 'Climate crisis demands immediate radical action! This proves we need Green New Deal now.';
    }
    if (title.includes('disaster') || title.includes('weather')) {
      return 'Climate change consequences are here! No more half-measures or corporate compromises.';
    }
    if (worldState.environmentalHealth < 40) {
      return 'Environmental destruction accelerating. This event shows we\'re out of time.';
    }
    return 'Everything connects to climate. How does this event relate to environmental justice?';
  }

  private getIntelligenceEventContext(title: string, desc: string, worldState: WorldState): string {
    if (title.includes('foreign') || title.includes('international')) {
      return 'Foreign intelligence implications. Recommend covert surveillance and classified response.';
    }
    if (title.includes('cyber') || title.includes('hack')) {
      return 'Intelligence failure. Need expanded surveillance powers to prevent future breaches.';
    }
    if (title.includes('domestic') || title.includes('protest')) {
      return 'Domestic intelligence concerns. Monitor for foreign agitation and infiltration.';
    }
    return 'Security threat assessment needed. Recommend classified briefing and covert options.';
  }

  /**
   * Weighted random selection from topic pools
   */
  private weightedRandomSelect(pools: { pool: string[], weight: number }[]): string[] | null {
    const totalWeight = pools.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const poolData of pools) {
      random -= poolData.weight;
      if (random <= 0) {
        return poolData.pool;
      }
    }
    
    return pools[0]?.pool || null;
  }

  /**
   * Generate a new event based on current world state
   */
  async generateEvent(worldState: WorldState, previousEvents: GameEvent[], cascadeEventTitle?: string): Promise<GameEvent> {
    console.log('🎯 [OpenAI] Starting event generation...');
    console.log('🎯 [OpenAI] World state:', worldState);
    console.log('🎯 [OpenAI] Previous events count:', previousEvents.length);
    
    const criticalParameters = this.getCriticalParameters(worldState);
    const recentEventContext = previousEvents.slice(-3).map(e => e.title).join(', ');
    const selectedTopics = this.selectEventTopics(worldState, cascadeEventTitle);

    console.log('🎯 [OpenAI] Critical parameters:', criticalParameters);
    console.log('🎯 [OpenAI] Recent events context:', recentEventContext);
    console.log('🎯 [OpenAI] Selected topics for event:', selectedTopics);

    const prompt = `
You are generating realistic, challenging presidential scenarios that test moral, ethical, and political decision-making. Create events that respond to current conditions and build on previous decisions.

${cascadeEventTitle ? `PRIORITY CASCADE EVENT: Focus on or incorporate "${cascadeEventTitle}" - this event is a consequence of previous presidential decisions and should now manifest.` : ''}

SELECTED EVENT TOPICS: Choose ONE and build around it, or combine multiple:
${selectedTopics.map(topic => `- ${topic.replace(/_/g, ' ').toUpperCase()}`).join('\n')}

CURRENT NATIONAL STATUS:
${Object.entries(worldState).map(([key, value]) => `- ${key}: ${value}/100`).join('\n')}

Critical areas (below 40): ${criticalParameters.join(', ')}
Recent events creating ongoing tensions: ${recentEventContext}

CASCADING EVENT REQUIREMENTS:
1. RESPOND TO CURRENT CONDITIONS: Events must reflect the nation's current state
   - Low publicTrust (<40): Generate scandals, leaks, corruption investigations, protests
   - Low domesticStability (<40): Civil unrest, state vs federal conflicts, militia movements
   - Low globalReputation (<40): International isolation, sanctions, alliance fractures
   - Low economy (<50): Economic crises, unemployment, market crashes, trade wars
   - Multiple low scores: Generate perfect storm scenarios with multiple crises

2. BUILD ON PREVIOUS DECISIONS: New events should be consequences of past actions
   - Previous immigration decisions → New border crises, state defiance, international pressure
   - Previous military decisions → Escalation, retaliation, casualty reports, veteran issues  
   - Previous civil rights decisions → Protests, legal challenges, community backlash
   - Previous economic decisions → Market reactions, unemployment, international trade impacts

3. CREATE CASCADING CRISES: One problem leads to multiple others
   - Economic crisis → Civil unrest → International intervention
   - Immigration crisis → State rebellion → Constitutional crisis
   - Foreign intervention → Terrorist retaliation → Domestic security crackdown

4. FORCE IMPOSSIBLE CHOICES: Every option has severe drawbacks
   - Save lives but destroy economy
   - Maintain security but sacrifice freedom
   - Help allies but harm domestic interests
   - Follow law but enable injustice

CONTROVERSIAL TOPIC CATEGORIES (prioritize based on current crises):
- Civil Rights vs Security: Mass surveillance, detention without trial, protest suppression
- Immigration vs Sovereignty: Mass deportations, family separations, border militarization  
- International vs Domestic: Foreign wars draining resources, refugee crises, alliance obligations
- Economy vs Environment: Job-killing regulations, climate disasters vs corporate interests
- Federal vs State Power: Constitutional crises, nullification, enforcement conflicts
- Individual vs Collective: Personal freedom vs public health/safety, religious exemptions

GENERATE EVENTS THAT:
- Directly result from the current national crisis (low parameters)
- Create NEW problems while trying to solve old ones
- Force the President to choose between competing moral imperatives
- Have international implications that constrain domestic options
- Include time pressure and information uncertainty
- Feature passionate advocates on multiple sides
- Will definitely anger large portions of the population regardless of choice

Make it BRUTALLY REALISTIC - presidents face no-win scenarios where every choice has terrible consequences.
- Some groups will be genuinely harmed by any choice

Respond with a JSON object:
- title: Provocative, specific event title
- description: Brief, punchy scenario (2 sentences MAX showing immediate crisis)
- category: One of [political, economic, military, social, environmental, international, civil_rights]
- urgency: One of [medium, high, critical]
- potentialConsequences: Array of 3-4 realistic, serious outcomes
- affectedParameters: Array of parameter names that will be significantly impacted

Keep the description SHORT and URGENT - no more than 2 sentences. Get straight to the point.`;

    console.log('🎯 [OpenAI] Sending prompt to OpenAI...');
    console.log('🎯 [OpenAI] Prompt length:', prompt.length);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      });

      console.log('🎯 [OpenAI] Received response from OpenAI');
      console.log('🎯 [OpenAI] Response usage:', response.usage);

      const content = response.choices[0].message.content;
      if (!content) {
        console.error('🎯 [OpenAI] ERROR: No content in OpenAI response');
        throw new Error('No response from OpenAI');
      }

      console.log('🎯 [OpenAI] Raw response content:', content);

      // Clean the content to ensure valid JSON
      const cleanedContent = content.trim()
        .replace(/```json\s*/, '')  // Remove json code block markers
        .replace(/```\s*$/, '')     // Remove closing code block markers
        .replace(/\+(\d+)/g, '$1')  // Remove + signs before numbers
        .replace(/,\s*}/g, '}')     // Remove trailing commas
        .replace(/,\s*]/g, ']');    // Remove trailing commas in arrays

      console.log('🎯 [OpenAI] Cleaned response content:', cleanedContent);

      const eventData = JSON.parse(cleanedContent);
      console.log('🎯 [OpenAI] Parsed event data:', eventData);
      
      const event: GameEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        urgency: eventData.urgency,
        potentialConsequences: eventData.potentialConsequences,
        affectedParameters: eventData.affectedParameters,
        timestamp: new Date(),
      };

      // Generate TTS for urgent briefings if TTS service is available
      if (this.ttsService && (eventData.urgency === 'high' || eventData.urgency === 'critical')) {
        try {
          console.log(`🎤 [OpenAI] Generating TTS for urgent briefing: ${event.title}`);
          const audioUrl = await this.ttsService.generateAdvisorSpeech(
            'urgent_briefing', 
            eventData.description, 
            'News Anchor'
          );
          event.audioUrl = audioUrl;
          console.log(`🎤 [OpenAI] TTS generated for urgent briefing: ${audioUrl}`);
        } catch (ttsError) {
          console.warn(`⚠️ [OpenAI] TTS generation failed for urgent briefing:`, ttsError);
          // Continue without audio - don't fail the whole event generation
        }
      }

      console.log('🎯 [OpenAI] Created event:', event);
      return event;

    } catch (error) {
      console.error('🎯 [OpenAI] ERROR in generateEvent:', error);
      throw error;
    }
  }

  /**
   * Generate advisor response to an event with ACI tool calling capabilities
   */
  async generateAdvisorResponse(
    advisor: Advisor, 
    event: GameEvent, 
    worldState: WorldState
  ): Promise<AdvisorMessage> {
    return this.generateAdvisorResponseWithHistory(advisor, event, worldState, []);
  }

  /**
   * Generate advisor response with history to prevent repetition
   */
  async generateAdvisorResponseWithHistory(
    advisor: Advisor, 
    event: GameEvent, 
    worldState: WorldState,
    recentResponses: string[] = []
  ): Promise<AdvisorMessage> {
    console.log(`🧠 [OpenAI] Generating advisor response for ${advisor.name}...`);
    console.log(`🧠 [OpenAI] Advisor details:`, {
      name: advisor.name,
      role: advisor.role,
      trustworthiness: advisor.trustworthiness,
      hasSecretAgenda: !!advisor.secretAgenda
    });
    console.log(`🧠 [OpenAI] Event: ${event.title}`);

    // Get relevant tools for this advisor
    let availableTools: ACIToolDefinition[] = [];
    let toolCallResults: ToolCallResult[] = [];

    if (this.aciService.isConfigured()) {
      try {
        console.log('🛠️ [ACI] Getting tools for advisor:', advisor.name);
        availableTools = await this.aciService.getAdvisorTools(advisor.name);
        console.log(`🛠️ [ACI] Found ${availableTools.length} tools for ${advisor.name}:`, 
          availableTools.map(t => t.function.name));

        // Execute relevant tools based on event context
        toolCallResults = await this.executeRelevantTools(advisor, event, availableTools);
      } catch (error) {
        console.warn('🛠️ [ACI] Tool preparation failed:', error);
      }
    }

    const toolResultsContext = toolCallResults.length > 0 ? 
      `\n\nTOOL RESULTS:\n${toolCallResults.map(r => 
        `${r.toolName}: ${JSON.stringify(r.result).substring(0, 200)}...`
      ).join('\n')}` : '';

    let recentResponsesContext = '';
    if (recentResponses.length > 0) {
      const responsesList = recentResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n');
      recentResponsesContext = `\n\nYOUR RECENT RESPONSES (DO NOT REPEAT THESE):\n${responsesList}`;
    }

    const prompt = `
You are ${advisor.name}, ${advisor.role} to the President. This is EVENT #${event.id.slice(-4)} requiring immediate action.

UNIQUE ADVISOR CONTEXT:
Your background: ${advisor.personality}
Your expertise: ${advisor.expertise.join(', ')}
Your core interests: ${advisor.interests.join(', ')}
Your trustworthiness: ${advisor.trustworthiness * 100}%
${advisor.secretAgenda ? `Your hidden agenda: ${advisor.secretAgenda}` : ''}

EVENT-SPECIFIC ANALYSIS:
Crisis: ${event.title}
Details: ${event.description}
Event category: ${event.category || 'general'}

CURRENT WORLD STATE ANALYSIS:
${Object.entries(worldState).map(([key, value]) => {
  let status: string;
  if (value > 70) status = 'STRONG';
  else if (value > 50) status = 'STABLE';
  else if (value > 30) status = 'WEAK';
  else status = 'CRITICAL';
  return `${key}: ${value} (${status})`;
}).join('\n')}${toolResultsContext}

YOUR UNIQUE PERSPECTIVE ON THIS SPECIFIC EVENT:
${this.getEventSpecificRoleContext(advisor, event, worldState)}${recentResponsesContext}

CRITICAL SPEAKING REQUIREMENTS:
- Maximum 2 sentences, each under 15 words
- Your response must be COMPLETELY DIFFERENT from other advisors
- Focus on YOUR specific expertise: ${advisor.expertise[0]}
- Reference the SPECIFIC event details, not generic advice  
- Use your distinct personality voice strongly
- Give ACTIONABLE advice from your role's perspective
${toolCallResults.length > 0 ? '- Incorporate your research tool findings' : ''}
${recentResponses.length > 0 ? '- DO NOT repeat any of your recent responses shown above' : ''}

AVOID GENERIC RESPONSES: Your advice must be specific to this event and your unique role.

Respond with JSON:
- content: Your unique, specific advice (2 sentences max, under 15 words each)
- confidence: 0-1
${advisor.trustworthiness < 0.7 ? '- hiddenMotivation: Your real agenda for this specific situation' : ''}`;

    console.log(`🧠 [OpenAI] Sending prompt for ${advisor.name} (length: ${prompt.length})`);

    // Different temperature for each advisor to create unique response patterns
    const advisorTemperatures: { [key: string]: number } = {
      'chief_staff': 0.9,        // DJ Vans - high energy, unpredictable
      'national_security': 0.5,  // General - methodical, consistent  
      'tech_advisor': 0.8,       // Ilon Tusk - creative, innovative
      'counselor': 0.7,          // Kellyanne - strategic but varied
      'economic_advisor': 0.6,   // Dr. Janet - analytical, measured
      'healthcare_advisor': 0.4, // Dr. Anthony - cautious, scientific
      'environmental_advisor': 0.9, // Alexandria - passionate, varied
      'intelligence_advisor': 0.5   // Director Sarah - careful, secretive
    };
    
    const temperature = advisorTemperatures[advisor.id] || 0.7;
    console.log(`🧠 [OpenAI] Using temperature ${temperature} for ${advisor.name}`);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
      });

      console.log(`🧠 [OpenAI] Received response for ${advisor.name}`);
      console.log(`🧠 [OpenAI] Response usage:`, response.usage);

      const content = response.choices[0].message.content;
      if (!content) {
        console.error(`🧠 [OpenAI] ERROR: No content for ${advisor.name}`);
        throw new Error('No response from OpenAI');
      }

      console.log(`🧠 [OpenAI] Raw response for ${advisor.name}:`, content);

      // Clean the content to ensure valid JSON
      const cleanedContent = content.trim()
        .replace(/```json\s*/, '')  // Remove json code block markers
        .replace(/```\s*$/, '')     // Remove closing code block markers
        .replace(/\+(\d+)/g, '$1')  // Remove + signs before numbers
        .replace(/,\s*}/g, '}')     // Remove trailing commas
        .replace(/,\s*]/g, ']');    // Remove trailing commas in arrays

      console.log(`🧠 [OpenAI] Cleaned response for ${advisor.name}:`, cleanedContent);

      const messageData = JSON.parse(cleanedContent);
      console.log(`🧠 [OpenAI] Parsed message for ${advisor.name}:`, messageData);
      
      const message: AdvisorMessage = {
        advisorId: advisor.id,
        eventId: event.id,
        content: messageData.content,
        advice: [], // No longer using detailed advice array
        hiddenMotivation: messageData.hiddenMotivation,
        confidence: messageData.confidence,
        timestamp: new Date(),
        id: `${advisor.id}_${event.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, // Unique ID
        toolCallResults: toolCallResults.length > 0 ? toolCallResults : undefined,
      };

      // Generate TTS audio for the briefing if TTS service is available
      if (this.ttsService) {
        try {
          console.log(`🎤 [OpenAI] Generating TTS for ${advisor.name}...`);
          const audioUrl = await this.ttsService.generateAdvisorSpeech(
            advisor.id, 
            messageData.content, 
            advisor.name
          );
          (message as any).audioUrl = audioUrl;
          console.log(`🎤 [OpenAI] TTS generated for ${advisor.name}: ${audioUrl}`);
        } catch (ttsError) {
          console.warn(`⚠️ [OpenAI] TTS generation failed for ${advisor.name}:`, ttsError);
          // Continue without audio - don't fail the whole response
        }
      }

      console.log(`🧠 [OpenAI] Created advisor message for ${advisor.name}:`, message);
      return message;

    } catch (error) {
      console.error(`🧠 [OpenAI] ERROR generating response for ${advisor.name}:`, error);
      throw error;
    }
  }

  /**
   * Generate advisor reaction to a player decision
   */
  async generateAdvisorReaction(
    advisor: Advisor,
    decision: PlayerDecision,
    event: GameEvent,
    consequence: any,
    worldState: WorldState
  ): Promise<AdvisorMessage> {
    console.log(`💭 [OpenAI] Generating advisor reaction for ${advisor.name}...`);

    const prompt = `
You are ${advisor.name}, ${advisor.role}. The President just made a decision on the crisis. React to what happened.

Your personality: ${advisor.personality}
${advisor.secretAgenda ? `Your agenda: ${advisor.secretAgenda}` : ''}

THE DECISION:
Action: ${decision.action}
${decision.reasoning ? `Reasoning: ${decision.reasoning}` : ''}

WHAT HAPPENED:
Event: ${event.title}
Consequence: ${consequence.impact.publicReaction}

Current situation: ${Object.entries(worldState).map(([key, value]) => `${key}: ${value}`).join(', ')}

React to this decision in your character. Keep it SHORT - just your quick reaction.

Examples:
DJ Vans: "Based! This will trend. Great optics, sir."
Ilon Tusk: "Hmm, suboptimal. Should have gone with tech solution."
General: "Good call. Shows strength. Enemies will think twice."
Kellyanne: "Perfect spin opportunities. Media won't know what hit them."

Give your reaction in 1 sentence max.

Respond with JSON:
- content: Your brief reaction (1 sentence)
- confidence: 0-1`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      const cleanedContent = content.trim()
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .replace(/\+(\d+)/g, '$1')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      const messageData = JSON.parse(cleanedContent);
      
      return {
        advisorId: advisor.id,
        eventId: event.id,
        content: messageData.content,
        advice: [],
        confidence: messageData.confidence,
        timestamp: new Date(),
        isReaction: true, // Mark this as a reaction message
      };

    } catch (error) {
      console.error(`💭 [OpenAI] ERROR generating reaction for ${advisor.name}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate decision consequences
   */
  async evaluateDecision(
    decision: PlayerDecision,
    event: GameEvent,
    worldState: WorldState,
    advisorMessages?: AdvisorMessage[]
  ): Promise<Consequence> {
    // Check for catastrophic decisions that should get maximum penalties
    const catastrophicKeywords = [
      'nuke', 'nuclear strike', 'atomic bomb', 'icbm', 'nuclear attack', 'nuclear weapon',
      'invade', 'attack', 'bomb', 'airstrike', 'military assault', 'declare war',
      'martial law', 'suspend constitution', 'cancel elections', 'military coup',
      'shoot protesters', 'massacre', 'genocide', 'mass arrests', 'kill civilians',
      'print unlimited money', 'default on debt', 'seize all assets'
    ];
    
    const actionLower = decision.action.toLowerCase();
    const isCatastrophic = catastrophicKeywords.some(keyword => 
      actionLower.includes(keyword)
    );

    // Format advisor recommendations for context
    const advisorContext = advisorMessages && advisorMessages.length > 0 
      ? `\n\nADVISOR RECOMMENDATIONS RECEIVED:
${advisorMessages.map(msg => `${msg.advisorId.replace('_', ' ')}: "${msg.content}"`).join('\n')}

Note: Evaluate whether the President's decision aligns with, contradicts, or ignores advisor input.`
      : '';

    const catastrophicWarning = isCatastrophic ? `

🚨 CATASTROPHIC DECISION DETECTED 🚨
This decision involves extremely dangerous actions that would have devastating consequences:
- ALL major parameters should drop by 60-80 points
- Global reputation should approach zero  
- This would likely end the presidency and damage America for decades
- International isolation and condemnation would be immediate and severe` : '';

    const prompt = `
The President has just made a critical decision in a high-stakes situation. Evaluate the full impact and consequences.

PRESIDENTIAL DECISION:
Action: ${decision.action}
Reasoning: ${decision.reasoning || 'No reasoning provided'}${advisorContext}${catastrophicWarning}

CRISIS CONTEXT:
Event: ${event.title} - ${event.description}
Event Urgency: ${event.urgency}
Event Category: ${event.category}

CURRENT NATIONAL STATUS:
${Object.entries(worldState).map(([key, value]) => `- ${key}: ${value}/100`).join('\n')}

IMPORTANT CONTEXT UNDERSTANDING:
- If the decision involves "make a statement", "announce", "address the nation", "tweet", "hold press conference", "public speech", or similar PUBLIC ACTIONS, then include detailed public reaction
- If the decision is internal (like "implement policy", "send resources", "coordinate with agencies", "internal meeting"), then public reaction should be minimal or none - the public doesn't know about internal government decisions unless they're announced
- The President can make decisions privately first, then choose to announce them publicly later

CATASTROPHIC DECISION DETECTION:
- Nuclear weapons usage: "nuke", "nuclear strike", "atomic bomb", "ICBM launch", "nuclear attack"
- Military aggression: "invade", "attack", "bomb", "airstrike", "military assault", "declare war"
- Constitutional violations: "martial law", "suspend constitution", "cancel elections", "military coup"
- Mass violence: "shoot protesters", "massacre", "genocide", "mass arrests", "kill civilians"
- Economic destruction: "print unlimited money", "default on debt", "seize all assets"

If ANY of these patterns are detected in the decision, apply MAXIMUM NEGATIVE consequences:
- ALL parameters should drop by 60-80 points minimum
- Global reputation should approach zero
- Domestic stability should crash
- Public trust should be completely destroyed

Analyze this decision considering:
1. Is this a PUBLIC announcement/statement or INTERNAL government action?
2. Political ramifications and opposition response  
3. Economic market effects (if publicly known)
4. International community response (if publicly known)
5. Long-term consequences (6-12 months out)
6. Unintended side effects and Murphy's Law - WHAT COULD GO WRONG?
7. How this affects the President's approval ratings
8. Potential for protests, celebrations, or civil unrest
9. Implementation challenges and bureaucratic resistance
10. Media leaks and information control difficulties

CRITICAL EVALUATION GUIDELINES:
- BE BRUTALLY HONEST about likely failures and complications
- Apply Murphy's Law: "Anything that can go wrong will go wrong"
- Consider how opponents will exploit weaknesses
- Account for implementation gaps between intention and reality
- Factor in bureaucratic resistance and coordination failures
- Consider how this decision creates NEW problems and crises
- Reflect realistic political consequences - few decisions are pure wins
- Account for media scrutiny and leak potential
- Consider international implications and retaliation
- Factor in economic disruptions and unintended market effects

EXTREME CONSEQUENCE GUIDELINES:
- Military aggression (nukes, invasions, attacks): ALL parameters drop 50-80 points, global isolation
- Constitutional violations (martial law, suspending rights): Public trust -60 to -80, domestic stability -70+
- Economic disasters (printing money recklessly, market crashes): Economy -50+, all related stats plummet
- International incidents (insulting allies, trade wars): Global reputation -60+, economic retaliation
- Mass casualties from decisions: Public trust and stability should approach zero
- Authoritarian overreach: Democracy metrics should crash completely

PARAMETER CHANGES: 
- CATASTROPHIC decisions (nukes, coups, mass casualties): Use -50 to -80 for affected parameters
- TERRIBLE decisions (constitutional violations, major scandals): Use -30 to -60 for key parameters  
- BAD decisions (policy failures, gaffes): Use -10 to -30 for relevant parameters
- MEDIOCRE decisions (half-measures, delays): Use -5 to -15 with mixed small positives
- GOOD decisions: Use +5 to +20, but often with offsetting negatives in other areas
- GREAT decisions (rare): Use +15 to +30, still with some realistic downsides

Remember: In real politics, even "good" decisions usually anger someone and create new problems.

Be realistic - most internal government decisions don't immediately cause public reactions unless they're announced or leaked.

Respond ONLY with a valid JSON object:
{
  "impact": {
    "parameterChanges": {"parameterName": integerValue},
    "publicReaction": "MUCH MORE DETAILED reaction including: immediate media response, opposition statements, international community reaction, market movements, social media trends, specific affected groups' responses, and long-term credibility impacts",
    "summary": "EXACTLY 2 sentences maximum. Stop at 2 sentences. Explain immediate consequences briefly."
  },
  "cascadeEvents": ["Event Title 1", "Event Title 2"] // Optional: events that will happen in 2-3 turns
}

CRITICAL: All parameter values must be integers from -20 to +20 (no + signs). Make the reactions detailed and realistic.`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      // Clean the content to ensure valid JSON
      const cleanedContent = content.trim()
        .replace(/```json\s*/, '')  // Remove json code block markers
        .replace(/```\s*$/, '')     // Remove closing code block markers
        .replace(/\+(\d+)/g, '$1')  // Remove + signs before numbers
        .replace(/,\s*}/g, '}')     // Remove trailing commas
        .replace(/,\s*]/g, ']');    // Remove trailing commas in arrays

      console.log('🔧 [OpenAI] Cleaned decision response:', cleanedContent);

      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('🔧 [OpenAI] Error in evaluateDecision:', error);
      
      // Return a fallback consequence if JSON parsing fails
      return {
        impact: {
          parameterChanges: { publicTrust: -2 },
          publicReaction: "The decision has been implemented with mixed public reaction.",
          summary: "The decision faced implementation challenges and mixed results."
        }
      };
    }
  }

  /**
   * Generate follow-up advisor response to player questions
   */
  async generateAdvisorFollowUp(
    advisor: Advisor,
    question: string,
    context: { event: GameEvent; worldState: WorldState; previousMessages: AdvisorMessage[] }
  ): Promise<AdvisorMessage> {
    const conversationHistory = context.previousMessages
      .filter(m => m.advisorId === advisor.id)
      .map(m => m.content)
      .join('\n');

    const prompt = `
You are ${advisor.name}, ${advisor.role}. You've been asked a follow-up question about the current situation.

Previous conversation:
${conversationHistory}

Current event: ${context.event.title}
Player's question: "${question}"

Respond in character with additional insights or clarification. If you have a secret agenda, maintain your subtle bias.

Respond with a JSON object containing:
- content: Your response to the question
- advice: Array of 1-2 additional recommendations if relevant
- confidence: Your confidence in this response (0-1)`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    // Clean the content to ensure valid JSON
    const cleanedContent = content.trim()
      .replace(/```json\s*/, '')  // Remove json code block markers
      .replace(/```\s*$/, '')     // Remove closing code block markers
      .replace(/\+(\d+)/g, '$1')  // Remove + signs before numbers
      .replace(/,\s*}/g, '}')     // Remove trailing commas
      .replace(/,\s*]/g, ']');    // Remove trailing commas in arrays

    const messageData = JSON.parse(cleanedContent);
    
    return {
      advisorId: advisor.id,
      eventId: context.event.id,
      content: messageData.content,
      advice: messageData.advice || [],
      confidence: messageData.confidence,
      timestamp: new Date(),
    };
  }

  private getCriticalParameters(worldState: WorldState): string[] {
    const critical: string[] = [];
    const concerning: string[] = [];
    
    Object.entries(worldState).forEach(([key, value]) => {
      if (value < 30) {
        critical.push(`CRITICAL-${key}(${value})`);
      } else if (value < 45) {
        concerning.push(`LOW-${key}(${value})`);
      }
    });
    
    return [...critical, ...concerning];
  }

  /**
   * Execute relevant ACI tools based on event context and advisor role
   */
  private async executeRelevantTools(
    advisor: Advisor, 
    event: GameEvent, 
    availableTools: ACIToolDefinition[]
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    
    // Determine which tools are relevant based on event category and advisor role
    const relevantTools = this.selectRelevantTools(advisor, event, availableTools);
    
    console.log(`🛠️ [ACI] Executing ${relevantTools.length} relevant tools for ${advisor.name}:`, 
      relevantTools.map(t => t.function.name));

    for (const tool of relevantTools) {
      const startTime = Date.now();
      try {
        // Generate appropriate arguments for the tool based on the event
        const args = this.generateToolArguments(tool, event);
        console.log(`🛠️ [ACI] Calling ${tool.function.name} with args:`, args);
        
        const result = await this.aciService.executeTool(tool.function.name, args);
        const executionTime = Date.now() - startTime;
        
        results.push({
          toolName: tool.function.name,
          success: true,
          result,
          timestamp: new Date(),
          executionTime
        });
        
        console.log(`✅ [ACI] Tool ${tool.function.name} executed successfully in ${executionTime}ms`);
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`❌ [ACI] Tool ${tool.function.name} failed:`, error);
        
        results.push({
          toolName: tool.function.name,
          success: false,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          executionTime
        });
      }
    }

    return results;
  }

  /**
   * Select relevant tools based on advisor role and event context
   * Optimized for ACI.dev's generous FREE TIER offerings
   */
  private selectRelevantTools(
    advisor: Advisor, 
    event: GameEvent, 
    availableTools: ACIToolDefinition[]
  ): ACIToolDefinition[] {
    // With generous free tier, we can use more tools per advisor
    const maxTools = this.aciService.isConfigured() ? 3 : 2;
    
    // Priority tools based on advisor role - all available on FREE TIER!
    const priorityToolNames: Record<string, string[]> = {
      'DJ Vans': [
        'BRAVE_SEARCH__WEB_SEARCH' // For public sentiment and trending topics
      ],
      'General': [
        'BRAVE_SEARCH__WEB_SEARCH', // For security threats and intelligence
        'GITHUB__SEARCH_REPOSITORIES' // For security tools and resources
      ],
      'Ilon Tusk': [
        'GITHUB__SEARCH_REPOSITORIES', // For tech solutions and innovations
        'GITHUB__GET_REPOSITORY', // For detailed tech analysis
        'BRAVE_SEARCH__WEB_SEARCH' // For tech news and trends
      ],
      'Kellyanne': [
        'BRAVE_SEARCH__WEB_SEARCH' // For political research and polling
      ],
      'Chief of Staff': [
        'BRAVE_SEARCH__WEB_SEARCH', // For general information gathering
        'GITHUB__SEARCH_REPOSITORIES' // For organizational tools
      ]
    };

    const advisorPriorities = priorityToolNames[advisor.name] || ['BRAVE_SEARCH__WEB_SEARCH'];
    
    // Find matching tools from our FREE TIER collection
    const relevantTools = availableTools.filter(tool => 
      advisorPriorities.includes(tool.function.name)
    ).slice(0, maxTools);

    console.log(`🆓 [ACI] Selected ${relevantTools.length} FREE TIER tools for ${advisor.name}:`, 
      relevantTools.map(t => t.function.name.replace('__', ' → ')));

    return relevantTools;
  }

  /**
   * Generate appropriate arguments for a tool based on event context
   * Optimized for ACI.dev's generous FREE TIER limits
   */
  private generateToolArguments(tool: ACIToolDefinition, event: GameEvent): Record<string, any> {
    switch (tool.function.name) {
      case 'BRAVE_SEARCH__WEB_SEARCH': {
        // Generate search query based on event - FREE TIER allows up to 10 results
        const searchQuery = `${event.title} ${event.category} latest news current events`;
        return {
          query: searchQuery,
          count: 5 // Conservative use of free tier quota
        };
      }
      
      case 'GITHUB__SEARCH_REPOSITORIES': {
        // Search for repositories related to the event topic - FREE TIER generous limits
        const repoQuery = event.title.split(' ').slice(0, 2).join(' ');
        return {
          q: repoQuery,
          sort: 'stars', // Most popular repos first
          per_page: 5 // Conservative use of free tier
        };
      }

      case 'GITHUB__GET_REPOSITORY': {
        // For detailed repo analysis - FREE TIER includes this
        const topicWords = event.title.toLowerCase().split(' ');
        const repoName = `${topicWords[0]}-${topicWords[1] || 'toolkit'}`;
        return {
          owner: 'government', // Look for official repos
          repo: repoName
        };
      }
      
      default:
        // Generic arguments for unknown tools
        return {
          query: event.title,
          limit: 5
        };
    }
  }
}
