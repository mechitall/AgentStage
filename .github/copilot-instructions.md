<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Agent Stage - AI Theater Platform

This is a modular, chat-based AI theater platform built with TypeScript and Node.js. The system simulates interactive scenarios with AI-powered agents.

## Architecture Guidelines

- **Modular Design**: Each game mode (like "The Oval Office") should be a separate module with its own events, advisors, and world state parameters
- **AI Integration**: Use OpenAI GPT models for dynamic content generation, advisor personalities, and decision evaluation
- **State Management**: Maintain clear separation between event generation, advisor logic, and world state tracking
- **Scalability**: Design for easy addition of new modes and features

## Key Components

- `GameEngine`: Core game mechanics and state management
- `EventGenerator`: Creates dynamic events using OpenAI
- `AdvisorSystem`: Manages AI advisor agents with unique personalities
- `WorldState`: Tracks and updates game parameters
- `DecisionEvaluator`: Processes player decisions and consequences

## Code Style

- Use TypeScript interfaces for all data structures
- Implement dependency injection for testability
- Use async/await for all AI API calls
- Follow modular patterns for easy extension
