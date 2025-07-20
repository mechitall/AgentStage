# ACI.dev Tool Calling Integration for Agent Stage

## Overview

Agent Stage now features **ACI.dev tool calling engine integration**, enabling our AI advisors to access real-world data and tools during political simulations. This dramatically enhances the realism and depth of advisor responses by providing them with live intelligence gathering capabilities.

## 🛠️ Features

### **Dynamic Tool Discovery**
- Advisors can discover and use tools relevant to their role
- Each advisor has access to specialized tool sets based on their expertise
- Tools are dynamically selected based on event context and advisor specialization

### **Real-Time Intelligence Gathering**
- **Brave Search Integration**: Live web search for current events and context
- **GitHub Repository Search**: Technology and development research capabilities
- **Extensible Framework**: Easy to add more tools (Weather, Social Media, News APIs, etc.)

### **Professional Tool Results Display**
- Visual indicators showing which tools were executed
- Success/failure status with execution times
- Preview of gathered intelligence
- Error handling and fallback mechanisms

### **Role-Based Tool Access**
Each advisor has access to tools that match their expertise:

- **DJ Vans** (Chief Communications): Web search for public sentiment and messaging
- **General** (Secretary of Defense): Security and defense-related intelligence
- **Ilon Tusk** (Tech Advisor): GitHub repositories, technology research
- **Kellyanne** (Political Strategy): Polling data, research tools
- **Chief of Staff**: Organizational and coordination tools

## 🏗️ Architecture

### **Core Components**

1. **ACIService** (`src/services/aci.service.ts`)
   - Manages ACI.dev API connections
   - Handles tool discovery and execution
   - Provides fallback mock implementations for testing

2. **Enhanced OpenAIService** (`src/services/openai.service.ts`)
   - Integrates ACI tool calling into advisor responses
   - Executes relevant tools based on event context
   - Incorporates tool results into advisor briefings

3. **Updated Type Definitions** (`src/types/index.ts`)
   - `ToolCallResult`: Structure for tool execution results
   - `ACIToolDefinition`: Tool schema definitions
   - Enhanced `AdvisorMessage` with tool results

### **Tool Execution Flow**

1. **Event Occurs**: A new crisis or situation emerges
2. **Tool Discovery**: System identifies relevant tools for each advisor
3. **Tool Execution**: Advisors gather intelligence using ACI tools
4. **Response Generation**: Advisor responses incorporate real-world data
5. **UI Display**: Tool results are shown alongside advisor briefings

## 🔧 Configuration

### **Environment Variables**

Add these to your `.env` file:

```env
# ACI.dev Tool Calling Configuration
ACI_API_KEY=your_aci_api_key_here
ACI_LINKED_ACCOUNT_OWNER_ID=agent_stage_user
```

### **Getting ACI.dev Access**

1. Sign up at [platform.aci.dev](https://platform.aci.dev/)
2. Configure applications (Brave Search, GitHub, etc.)
3. Link your accounts for the tools you want to use
4. Get your API key and linked account owner ID
5. Add them to your environment configuration

## 🎮 User Experience

### **Enhanced Advisor Briefings**
When advisors respond to events, they now:
- Gather real-time intelligence relevant to the situation
- Show what tools they used to research the issue
- Display execution status and data previews
- Incorporate findings into their advice

### **Visual Indicators**
- ✅ **Success**: Tool executed successfully with data retrieved
- ❌ **Error**: Tool execution failed with error details
- 🛠️ **Tool Name**: Clear display of which intelligence tools were used
- ⏱️ **Timing**: Execution time for performance monitoring

### **Intelligence Cards**
Each advisor response can include:
```
🛠️ Intelligence Gathered:
✅ BRAVE SEARCH - WEB SEARCH (234ms)
   "Latest developments in cybersecurity threats show..."
✅ GITHUB - SEARCH REPOSITORIES (156ms)
   "Found 847 repositories related to infrastructure security..."
```

## 🧪 Mock Mode

The system includes comprehensive mock implementations for testing and development:

- **Mock Search Results**: Realistic search result structures
- **Mock GitHub Data**: Repository information with stars, languages, etc.
- **Error Simulation**: Tests failure scenarios and recovery
- **Performance Simulation**: Realistic execution times

## 🚀 Usage Examples

### **Crisis Scenario: Cybersecurity Breach**

1. **Event Generated**: "Major infrastructure hack detected"
2. **Tools Executed**: 
   - Brave Search: "infrastructure hack latest news current events"
   - GitHub: Search for security repositories
3. **Advisor Response**: 
   - DJ Vans: "Sir, the web shows this is trending. Need immediate statement."
   - General: "Intelligence confirms state-actor involvement. Military response options ready."
   - Ilon Tusk: "GitHub shows new security patches available. Deploy immediately."

### **Economic Crisis Example**

1. **Event**: "Stock market crash imminent"
2. **Intelligence Gathering**:
   - Web search for latest market news
   - Research economic indicators
3. **Enhanced Responses**: Advisors provide context-aware advice based on real data

## 🔬 Technical Details

### **Tool Selection Algorithm**
```typescript
// Example: Advisor gets tools based on role and event context
const relevantTools = await aciService.getAdvisorTools(advisor.name);
const toolResults = await executeRelevantTools(advisor, event, availableTools);
```

### **Result Integration**
Tool results are seamlessly integrated into the advisor's response context:
- Search results inform communication strategy
- Technical data influences policy recommendations
- Current events shape strategic advice

### **Error Handling**
- Graceful degradation if ACI.dev is unavailable
- Fallback to mock data for development
- User-visible error states with clear messaging

## 🔮 Future Enhancements

### **Planned Integrations**
- **Weather APIs**: Environmental factors in decision making
- **Social Media APIs**: Real-time sentiment analysis
- **News APIs**: Breaking news integration
- **Economic APIs**: Live market data
- **Discord/Slack**: Multi-player collaboration

### **Advanced Features**
- **Tool Caching**: Cache frequently used data
- **Smart Tool Selection**: ML-based tool relevance scoring
- **Collaborative Intelligence**: Advisors sharing tool results
- **Historical Context**: Tool results influence future decisions

## 🐛 Troubleshooting

### **Common Issues**

1. **"Tool calling service not configured"**
   - Check your `ACI_API_KEY` in `.env`
   - Verify your `ACI_LINKED_ACCOUNT_OWNER_ID`

2. **"Tool execution failed"**
   - Ensure your ACI.dev account has the required app permissions
   - Check that your linked accounts are properly configured

3. **"Mock results showing"**
   - This is normal during development/testing
   - Real tools will activate when ACI.dev is properly configured

### **Debug Mode**
Check the server console for detailed logging:
```
🛠️ [ACI] Tool calling service initialized: CONFIGURED
🛠️ [ACI] Getting tools for advisor: DJ Vans
🛠️ [ACI] Found 2 tools for DJ Vans: BRAVE_SEARCH__WEB_SEARCH
✅ [ACI] Tool BRAVE_SEARCH__WEB_SEARCH executed successfully in 234ms
```

## 📊 Performance Impact

- **Tool Execution**: Adds 200-500ms per advisor response
- **UI Enhancement**: Negligible impact on frontend performance  
- **Memory Usage**: Minimal increase with result caching
- **Network**: Additional API calls to ACI.dev services

## 🎯 Benefits

1. **Realism**: Advisors provide context-aware, data-driven advice
2. **Engagement**: Players see the "research process" behind recommendations  
3. **Education**: Learn how real advisors gather intelligence
4. **Immersion**: Decisions feel more consequential with real-world data
5. **Scalability**: Easy to add new tools and capabilities

---

**Ready to experience AI advisors with real-world intelligence?** 

Configure your ACI.dev credentials and watch your presidential advisors become exponentially more capable and realistic!
