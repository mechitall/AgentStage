// Core game data structures and interfaces

export interface WorldState {
  economy: number;
  military: number;
  publicTrust: number;
  globalReputation: number;
  domesticStability: number;
  environmentalHealth: number;
  technologicalAdvancement: number;
  [key: string]: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  category: 'political' | 'economic' | 'military' | 'social' | 'environmental' | 'international';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  potentialConsequences: string[];
  affectedParameters: string[];
  timestamp: Date;
  audioUrl?: string; // URL to TTS audio for urgent briefing
}

export interface Advisor {
  id: string;
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  interests: string[];
  secretAgenda?: string;
  trustworthiness: number; // 0-1, where 1 is fully trustworthy
  voiceProfile?: string; // For TTS integration
  availableTools?: ACIToolDefinition[]; // ACI tools available to this advisor
  toolUsageHistory?: ToolUsage[]; // History of tool usage
}

export interface AdvisorMessage {
  id?: string; // Unique identifier for this message
  advisorId: string;
  eventId: string;
  content: string;
  advice: string[];
  hiddenMotivation?: string;
  confidence: number; // 0-1
  timestamp: Date;
  isReaction?: boolean; // True if this is a reaction to a decision
  audioUrl?: string; // URL to TTS audio file
  toolCallResults?: ToolCallResult[]; // Results from ACI tool calls
}

// ACI Tool Calling Interfaces
export interface ACIToolDefinition {
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolUsage {
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  timestamp: Date;
  advisorId: string;
  contextEventId?: string;
}

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  result: any;
  error?: string;
  timestamp: Date;
  executionTime: number; // in milliseconds
}

export interface PlayerDecision {
  eventId: string;
  action: string;
  reasoning?: string;
  consultedAdvisors: string[];
  timestamp: Date;
}

export interface Consequence {
  impact: {
    parameterChanges: Partial<WorldState>;
    publicReaction: string;
    summary: string;
  };
  cascadeEvents?: string[]; // Events that will trigger after 2-3 turns
}

export interface GameSession {
  sessionId: string;
  playerId: string;
  mode: string;
  worldState: WorldState;
  events: GameEvent[];
  decisions: PlayerDecision[];
  pendingCascadeEvents: { eventTitle: string; triggersAtTurn: number }[]; // For delayed cascade events
  currentTurn: number;
  startTime: Date;
  endTime?: Date;
}

// Configuration interfaces
export interface GameConfig {
  mode: string;
  initialWorldState: WorldState;
  advisors: Advisor[];
  eventCategories: string[];
  difficultyLevel: 'easy' | 'normal' | 'hard' | 'nightmare';
}
