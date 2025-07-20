#!/usr/bin/env node

/**
 * Agent Stage API Test Script
 * 
 * This script demonstrates the core functionality of the Agent Stage platform
 * without requiring an actual OpenAI API key.
 */

const API_BASE = 'http://localhost:3000/api';

async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  } catch (error) {
    console.error(`❌ Error calling ${endpoint}:`, error.message);
    return null;
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const result = await makeRequest('/health');
  if (result) {
    console.log('✅ Server is healthy:', result.status);
    console.log('   Version:', result.version);
    console.log('   Timestamp:', result.timestamp);
  }
}

async function demonstrateGameFlow() {
  console.log('\n🎮 Demonstrating Game Flow...');
  console.log('(Note: This will fail without a valid OpenAI API key, but shows the structure)');
  
  // Attempt to start a game
  console.log('\n📍 Step 1: Starting game session...');
  const startResult = await makeRequest('/game/start', 'POST', {
    playerId: 'demo_player_' + Date.now()
  });
  
  if (startResult) {
    console.log('✅ Game started successfully!');
    console.log('   Session ID:', startResult.session.sessionId);
    console.log('   Initial Event:', startResult.gameState.currentEvent?.title || 'None');
  } else {
    console.log('❌ Game start failed (expected without OpenAI API key)');
  }

  console.log('\n📍 Step 2: Getting game state...');
  const stateResult = await makeRequest('/game/state');
  
  if (!stateResult) {
    console.log('❌ No active game session (expected)');
  }

  console.log('\n📍 Step 3: Testing other endpoints...');
  console.log('   - Decision endpoint: POST /api/game/decision');
  console.log('   - Ask advisor endpoint: POST /api/game/ask-advisor');
  console.log('   - Analytics endpoint: GET /api/game/analytics');
  console.log('   - End game endpoint: POST /api/game/end');
}

async function showProjectStructure() {
  console.log('\n📁 Project Structure:');
  console.log(`
Agent Stage - AI Theater Platform
├── 🎭 Core MVP Features:
│   ├── ✅ Dynamic event generation (OpenAI GPT)
│   ├── ✅ AI advisor agents with personalities
│   ├── ✅ Decision evaluation system
│   ├── ✅ World state management
│   └── ✅ Real-time web interface
├── 🏛️ The Oval Office Mode:
│   ├── 8 unique advisor personalities
│   ├── Complex world state parameters
│   ├── Hidden agendas and trustworthiness levels
│   └── Realistic political scenarios
├── 🔮 Planned Features:
│   ├── ElevenLabs voice synthesis
│   ├── ai|coustics audio enhancement
│   ├── ACI.dev tool calling
│   └── Weaviate vector database
└── 🛠️ Technical Stack:
    ├── TypeScript + Node.js backend
    ├── Express API server
    ├── OpenAI GPT-4 integration
    └── Modern web interface
  `);
}

async function main() {
  console.log('🎭 Agent Stage - API Test & Demonstration');
  console.log('==========================================');
  
  await testHealthCheck();
  await demonstrateGameFlow();
  await showProjectStructure();
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Add your OpenAI API key to .env file');
  console.log('2. Restart the server: npm run dev');
  console.log('3. Visit http://localhost:3000 to play');
  console.log('4. Implement voice features (ElevenLabs + ai|coustics)');
  console.log('5. Add advanced orchestration (ACI.dev + Weaviate)');
  
  console.log('\n✨ The Oval Office simulation is ready for your decisions!');
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { makeRequest, testHealthCheck, demonstrateGameFlow };
