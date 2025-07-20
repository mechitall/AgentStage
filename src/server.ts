import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameEngine } from './engine/game-engine';
import { OVAL_OFFICE_CONFIG } from './config/oval-office.config';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Game engine instance
let gameEngine: GameEngine | null = null;

// Initialize game engine
function initializeGameEngine(): GameEngine {
  console.log('🔧 [Server] Initializing game engine...');
  const apiKey = process.env.OPENAI_API_KEY;
  const aiAcousticsKey = process.env.AI_ACOUSTICS_API_KEY;
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
  console.log('🔧 [Server] Environment variables loaded:', {
    OPENAI_API_KEY: apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET',
    AI_ACOUSTICS_API_KEY: aiAcousticsKey ? 'SET' : 'NOT SET',
    ELEVENLABS_API_KEY: elevenlabsKey ? 'SET' : 'NOT SET',
    PORT: process.env.PORT || 'default',
    GAME_MODE: process.env.GAME_MODE || 'default'
  });
  
  if (!apiKey) {
    console.error('🔧 [Server] ERROR: OPENAI_API_KEY environment variable is required');
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  console.log('🔧 [Server] Creating GameEngine with OVAL_OFFICE_CONFIG...');
  const engine = new GameEngine(apiKey, OVAL_OFFICE_CONFIG, aiAcousticsKey, elevenlabsKey);
  console.log('🔧 [Server] GameEngine created successfully');
  return engine;
}

// Routes

/**
 * Start a new game session
 */
app.post('/api/game/start', async (req, res) => {
  console.log('🎬 [API] POST /api/game/start called');
  console.log('🎬 [API] Request body:', req.body);
  
  try {
    const { playerId } = req.body;
    if (!playerId) {
      console.log('🎬 [API] ERROR: No player ID provided');
      return res.status(400).json({ error: 'Player ID is required' });
    }

    console.log('🎬 [API] Player ID:', playerId);
    console.log('🎬 [API] Initializing game engine...');
    gameEngine = initializeGameEngine();
    
    console.log('🎬 [API] Starting session...');
    await gameEngine.startSession(playerId);
    console.log('🎬 [API] Session started successfully');
    
    console.log('🎬 [API] Getting game state...');
    const gameState = gameEngine.getGameState();
    console.log('🎬 [API] Game state:', {
      currentEvent: gameState.currentEvent?.title,
      worldState: gameState.worldState,
      advisorCount: gameState.availableAdvisors.length,
      messageCount: gameState.recentMessages.length
    });

    const response = {
      session: gameState.session,
      gameState,
      message: 'Game started successfully! You are now the President of the United States.',
    };
    
    console.log('🎬 [API] Sending successful response');
    res.json(response);
  } catch (error) {
    console.error('🎬 [API] Error starting game:', error);
    console.error('🎬 [API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * Get current game state
 */
app.get('/api/game/state', (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    console.log('🌐 [API] GET /api/game/state called');
    const gameState = gameEngine.getGameState();
    console.log('🌐 [API] Game state response:', {
      currentEvent: gameState.currentEvent?.id,
      recentMessagesCount: gameState.recentMessages.length,
      advisors: gameState.recentMessages.map(m => m.advisorId)
    });
    res.json(gameState);
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

/**
 * Make a decision on the current event
 */
app.post('/api/game/decision', async (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    const { eventId, action, reasoning } = req.body;
    if (!eventId || !action) {
      return res.status(400).json({ error: 'Event ID and action are required' });
    }

    const result = await gameEngine.processDecision(eventId, action, reasoning);
    const gameState = gameEngine.getGameState();

    res.json({
      result,
      gameState,
      message: 'Decision processed successfully',
    });
  } catch (error) {
    console.error('Error processing decision:', error);
    res.status(500).json({ error: 'Failed to process decision' });
  }
});

/**
 * Ask a question to a specific advisor
 */
app.post('/api/game/ask-advisor', async (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    const { advisorId, question, eventId } = req.body;
    if (!advisorId || !question || !eventId) {
      return res.status(400).json({ error: 'Advisor ID, question, and event ID are required' });
    }

    const response = await gameEngine.askAdvisor(advisorId, question, eventId);
    res.json({
      response,
      message: 'Advisor response received',
    });
  } catch (error) {
    console.error('Error asking advisor:', error);
    res.status(500).json({ error: 'Failed to get advisor response' });
  }
});

/**
 * Generate a new event manually (for testing)
 */
app.post('/api/game/new-event', async (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    const event = await gameEngine.generateNewEvent();
    // Note: This doesn't add the event to the session, just generates one
    res.json({
      event,
      message: 'New event generated',
    });
  } catch (error) {
    console.error('Error generating event:', error);
    res.status(500).json({ error: 'Failed to generate event' });
  }
});

/**
 * End current session
 */
app.post('/api/game/end', (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    const analytics = gameEngine.getAnalytics();
    const endedSession = gameEngine.endSession();
    gameEngine = null;

    res.json({
      endedSession,
      analytics,
      message: 'Game session ended',
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

/**
 * Get game analytics
 */
app.get('/api/game/analytics', (req, res) => {
  try {
    if (!gameEngine) {
      return res.status(400).json({ error: 'No active game session' });
    }

    const analytics = gameEngine.getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Get news videos for a session
 */
app.get('/api/game/news/:sessionId', async (req, res) => {
  console.log('📺 [API] GET /api/game/news called');
  
  try {
    const sessionId = req.params.sessionId;
    console.log('📺 [API] Getting news for session:', sessionId);
    
    if (!gameEngine) {
      console.log('📺 [API] ERROR: Game engine not initialized');
      return res.status(400).json({ error: 'Game engine not initialized' });
    }
    
    const newsVideos = gameEngine.getNewsVideos(sessionId);
    console.log(`📺 [API] Found ${newsVideos.length} news videos`);
    
    res.json({ 
      news: newsVideos,
      count: newsVideos.length 
    });
  } catch (error) {
    console.error('📺 [API] Error getting news videos:', error);
    res.status(500).json({ error: 'Failed to get news videos' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🎭 Agent Stage server running on port ${port}`);
  console.log(`📡 API available at http://localhost:${port}/api`);
  console.log(`🌐 Web interface at http://localhost:${port}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/game/start         - Start new game session');
  console.log('  GET  /api/game/state         - Get current game state');
  console.log('  POST /api/game/decision      - Make a decision');
  console.log('  POST /api/game/ask-advisor   - Ask advisor a question');
  console.log('  POST /api/game/new-event     - Generate new event');
  console.log('  POST /api/game/end           - End current session');
  console.log('  GET  /api/game/analytics     - Get game analytics');
  console.log('  GET  /api/health             - Health check');
});
