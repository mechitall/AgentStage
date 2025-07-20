let gameSession = null;
let currentEvent = null;
let isWaitingForResponse = false;

// DOM elements
const startOverlay = document.getElementById('start-overlay');
const messagesContainer = document.getElementById('messages');
const worldStatusContainer = document.getElementById('world-status');
const chatHeader = document.getElementById('chat-header');
const eventTitle = document.getElementById('event-title');
const eventUrgency = document.getElementById('event-urgency');
const decisionInput = document.getElementById('decision-input');
const sendButton = document.getElementById('send-button');

// Start the game
async function startGame() {
    // Prevent multiple clicks
    if (gameSession) {
        console.log('Game already started, ignoring duplicate start request');
        return;
    }
    
    // Disable the start button to prevent multiple clicks
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.disabled = true;
        startButton.textContent = 'Connecting...';
    }
    
    try {
        const response = await fetch('/api/game/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: 'player_' + Date.now()
            })
        });
        
        const data = await response.json();
        console.log('Game started:', data);
        
        if (data.session && data.session.sessionId) {
            gameSession = data.session.sessionId;
            startOverlay.classList.add('hidden');
            
            // Update world state from initial data
            updateWorldState(data.gameState.worldState);
            
            // Show initial system message
            addSystemMessage('Session established. Welcome to the Oval Office.');
            
            // Check if there's an event in the session.events array or gameState.currentEvent
            let eventToDisplay = data.gameState.currentEvent || (data.session.events && data.session.events.length > 0 ? data.session.events[0] : null);
            
            if (eventToDisplay) {
                currentEvent = eventToDisplay;
                displayEvent(currentEvent);
                
                // If there are recent messages, display them as advisor responses
                if (data.gameState.recentMessages && data.gameState.recentMessages.length > 0) {
                    setTimeout(() => {
                        displayAdvisorMessages(data.gameState.recentMessages, data.gameState.availableAdvisors);
                        enableDecisionInput();
                    }, 1500);
                } else {
                    // Get new advisor responses for the current event
                    setTimeout(() => {
                        getAdvisorResponses();
                    }, 1500);
                }
            } else {
                // Generate first event if none exists
                await generateEvent();
            }
        } else {
            throw new Error('Failed to start game session');
        }
    } catch (error) {
        console.error('Error starting game:', error);
        addSystemMessage('⚠️ Failed to establish connection. Please refresh and try again.');
        
        // Re-enable the start button on error
        const startButton = document.querySelector('.start-button');
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Enter the Oval Office';
        }
    }
}

// Generate a new event
async function generateEvent() {
    if (!gameSession) return;
    
    try {
        const response = await fetch('/api/game/new-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Event generated:', data);
        
        if (data.event) {
            currentEvent = data.event;
            displayEvent(data.event);
            updateWorldState(data.worldState);
            
            // Get advisor responses
            setTimeout(() => {
                getAdvisorResponses();
            }, 1500);
        }
    } catch (error) {
        console.error('Error generating event:', error);
        addSystemMessage('⚠️ Failed to generate event.');
    }
}

// Get advisor responses to current event
async function getAdvisorResponses() {
    if (!gameSession || !currentEvent) return;
    
    try {
        // Get current game state which should include recent advisor messages
        const response = await fetch('/api/game/state', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Game state with advisor responses:', data);
        
        if (data.recentMessages && data.recentMessages.length > 0) {
            // Show typing indicators for the actual selected advisors
            showTypingIndicatorsForAdvisors(data.recentMessages, data.availableAdvisors);
            
            // Display advisor messages with slight delays for realism
            setTimeout(() => {
                removeTypingIndicators();
                displayAdvisorMessages(data.recentMessages, data.availableAdvisors);
                
                // Enable decision input after all messages are shown
                setTimeout(() => {
                    enableDecisionInput();
                }, data.recentMessages.length * 800 + 500);
            }, 2000);
        } else {
            enableDecisionInput();
        }
    } catch (error) {
        console.error('Error getting advisor responses:', error);
        removeTypingIndicators();
        addSystemMessage('⚠️ Advisor communications interrupted.');
        enableDecisionInput();
    }
}

// Process user decision
async function processDecision(decision) {
    if (!gameSession) return;
    
    try {
        disableDecisionInput();
        addUserMessage(decision);
        
        // Get fresh game state to ensure we have the correct current event
        const stateResponse = await fetch('/api/game/state');
        const stateData = await stateResponse.json();
        
        if (stateData.currentEvent) {
            currentEvent = stateData.currentEvent;
        }
        
        const response = await fetch('/api/game/decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: currentEvent ? currentEvent.id : 'current',
                action: decision,
                reasoning: ''
            })
        });
        
        const data = await response.json();
        console.log('Decision processed:', data);
        
        if (data.error) {
            addSystemMessage(`❌ Error: ${data.error}`);
            enableDecisionInput();
            return;
        }
        
        if (data.result && data.result.consequence) {
            // Show consequences
            setTimeout(() => {
                const consequence = data.result.consequence;
                
                // Create detailed consequence message with stat changes
                let consequenceMsg = '';
                if (consequence.impact && consequence.impact.summary) {
                    consequenceMsg = consequence.impact.summary;
                }
                
                // Add parameter changes display
                if (consequence.impact && consequence.impact.parameterChanges) {
                    const changes = [];
                    for (const [param, value] of Object.entries(consequence.impact.parameterChanges)) {
                        if (value !== 0) {
                            const sign = value > 0 ? '+' : '';
                            const paramName = param.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            const emoji = value > 0 ? '📈' : '📉';
                            changes.push(`${emoji} **${paramName}**: ${sign}${value}`);
                        }
                    }
                    
                    if (changes.length > 0) {
                        consequenceMsg += `\n\n� **NATIONAL IMPACT:**\n${changes.join('\n\n')}`;
                    }
                }
                
                if (!consequenceMsg) {
                    consequenceMsg = 'Decision processed successfully.';
                }
                
                displayConsequences(consequenceMsg);
                updateWorldState(data.gameState.worldState);
                
                // Show advisor reactions after consequences
                setTimeout(() => {
                    if (data.result.advisorReactions && data.result.advisorReactions.length > 0) {
                        displayAdvisorReactions(data.result.advisorReactions);
                    }
                }, 1500);
                
                // Generate next event after showing consequences
                setTimeout(() => {
                    if (data.result.nextEvent) {
                        currentEvent = data.result.nextEvent;
                        displayEvent(currentEvent);
                        setTimeout(() => {
                            getAdvisorResponses();
                        }, 1500);
                    } else {
                        generateEvent();
                    }
                }, 3000);
            }, 1000);
        }
    } catch (error) {
        console.error('Error processing decision:', error);
        addSystemMessage('⚠️ Decision processing failed.');
        enableDecisionInput();
    }
}

// UI Helper Functions
function displayEvent(event) {
    eventTitle.textContent = event.title;
    eventUrgency.textContent = `${event.urgency.toUpperCase()} • ${event.category}`;
    
    // Create audio controls if TTS is available for urgent briefings
    let audioControls = '';
    if (event.audioUrl && (event.urgency === 'high' || event.urgency === 'critical')) {
        audioControls = `
            <div class="audio-controls" style="margin-top: 8px;">
                <button class="play-audio-btn" onclick="playAdvisorAudio('${event.audioUrl}', this)">
                    🎙️ Play Briefing
                </button>
                <div class="audio-status" style="display: none;">
                    <span class="loading">🎵 Loading...</span>
                    <span class="playing" style="display: none;">📻 Broadcasting</span>
                    <span class="error" style="display: none;">❌ Error</span>
                </div>
            </div>
        `;
    }
    
    // Add event as system message
    const eventMessage = document.createElement('div');
    eventMessage.className = 'message system';
    eventMessage.innerHTML = `
        <div class="system-message">
            <strong>🚨 URGENT BRIEFING</strong><br>
            ${event.description}
            ${audioControls}
        </div>
    `;
    
    messagesContainer.appendChild(eventMessage);
    scrollToBottom();
}

function displayAdvisorMessages(messages, advisors) {
    messages.forEach((message, index) => {
        const advisor = advisors.find(a => a.id === message.advisorId);
        if (!advisor) return;
        
        setTimeout(() => {
            // Remove the specific typing indicator for this advisor using advisor ID
            const typingIndicator = document.getElementById(`typing-${message.advisorId}`);
            if (typingIndicator) {
                typingIndicator.remove();
                console.log(`Removed typing indicator for ${advisor.name}`);
            }
            
            displayAdvisorMessage({
                advisor: advisor,
                message: message.content,
                audioUrl: message.audioUrl
            });
        }, index * 800);
    });
}

function displayAdvisorMessage(response) {
    const message = document.createElement('div');
    message.className = 'message advisor';
    
    const avatarClass = getAvatarClass(response.advisor.role);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create audio controls if TTS is available
    let audioControls = '';
    if (response.audioUrl) {
        audioControls = `
            <div class="audio-controls">
                <button class="play-audio-btn" onclick="playAdvisorAudio('${response.audioUrl}', this)">
                    🔊 Play
                </button>
                <div class="audio-status" style="display: none;">
                    <span class="loading">🎵 Loading...</span>
                    <span class="playing" style="display: none;">▶️ Playing</span>
                    <span class="error" style="display: none;">❌ Error</span>
                </div>
            </div>
        `;
    }

    // Create tool results display if available
    let toolResultsHtml = '';
    if (response.toolCallResults && response.toolCallResults.length > 0) {
        const toolResults = response.toolCallResults.map(result => {
            const statusIcon = result.success ? '✅' : '❌';
            const toolDisplayName = result.toolName.replace('__', ' - ').replace(/_/g, ' ');
            const executionTime = result.executionTime ? `(${result.executionTime}ms)` : '';
            
            let resultPreview = '';
            if (result.success && result.result) {
                try {
                    const preview = typeof result.result === 'string' 
                        ? result.result.substring(0, 100) 
                        : JSON.stringify(result.result).substring(0, 100);
                    resultPreview = `<div class="tool-result-preview">${preview}...</div>`;
                } catch (e) {
                    console.warn('Error parsing tool result for display:', e);
                    resultPreview = '<div class="tool-result-preview">Data retrieved</div>';
                }
            } else if (!result.success) {
                resultPreview = `<div class="tool-result-error">Error: ${result.error || 'Unknown error'}</div>`;
            }
            
            return `
                <div class="tool-result">
                    <div class="tool-info">
                        ${statusIcon} <strong>${toolDisplayName}</strong> ${executionTime}
                    </div>
                    ${resultPreview}
                </div>
            `;
        }).join('');

        toolResultsHtml = `
            <div class="tool-results">
                <div class="tool-results-header">🛠️ <strong>Intelligence Gathered:</strong></div>
                ${toolResults}
            </div>
        `;
    }
    
    message.innerHTML = `
        <div class="message-header">
            <div class="advisor-avatar ${avatarClass}">
                ${getAvatarInitials(response.advisor.name)}
            </div>
            <span class="advisor-name">${response.advisor.name}</span>
            <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-content">
            ${toolResultsHtml}
            ${response.message}
            ${audioControls}
        </div>
    `;
    
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function displayConsequences(consequences) {
    const message = document.createElement('div');
    message.className = 'message system';
    message.innerHTML = `
        <div class="system-message consequence-message">
            <strong>📊 DECISION IMPACT</strong><br>
            <div class="consequence-content">
                ${consequences}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function addUserMessage(text) {
    const message = document.createElement('div');
    message.className = 'message user';
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    message.innerHTML = `
        <div class="message-header">
            <span class="advisor-name">You</span>
            <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-content">
            ${text}
        </div>
    `;
    
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function addSystemMessage(text) {
    const message = document.createElement('div');
    message.className = 'message system';
    message.innerHTML = `<div class="system-message">${text}</div>`;
    
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function showTypingIndicatorsForAdvisors(messages, advisors) {
    console.log('Showing typing indicators for selected advisors:', messages.map(m => m.advisorId));
    
    messages.forEach((message, index) => {
        const advisor = advisors.find(a => a.id === message.advisorId);
        if (!advisor) return;
        
        setTimeout(() => {
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.id = `typing-${message.advisorId}`; // Use advisor ID instead of index
            
            const avatarClass = getAvatarClass(advisor.role);
            
            indicator.innerHTML = `
                <div class="message-header">
                    <div class="advisor-avatar ${avatarClass}">
                        ${getAvatarInitials(advisor.name)}
                    </div>
                    <span class="advisor-name">${advisor.name}</span>
                </div>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            messagesContainer.appendChild(indicator);
            scrollToBottom();
        }, index * 300);
    });
}

function showTypingIndicators() {
    // Legacy function - now we use showTypingIndicatorsForAdvisors instead
    const advisors = ['DJ Vans', 'General Jake Sullivan-Peters', 'Ilon Tusk', 'Kellyanne Conway-Smith'];
    
    advisors.forEach((name, index) => {
        setTimeout(() => {
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.id = `typing-${index}`;
            
            const avatarClass = getAvatarClassByName(name);
            
            indicator.innerHTML = `
                <div class="message-header">
                    <div class="advisor-avatar ${avatarClass}">
                        ${getAvatarInitials(name)}
                    </div>
                    <span class="advisor-name">${name}</span>
                </div>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            messagesContainer.appendChild(indicator);
            scrollToBottom();
        }, index * 300);
    });
}

function removeTypingIndicators() {
    console.log('Removing all typing indicators...');
    const indicators = document.querySelectorAll('.typing-indicator');
    console.log(`Found ${indicators.length} typing indicators to remove`);
    
    indicators.forEach((indicator, index) => {
        console.log(`Removing typing indicator ${index + 1}:`, indicator.id);
        indicator.remove();
    });
    
    // Double-check by removing any remaining indicators with specific advisor IDs
    const advisorIds = ['chief_staff', 'national_security', 'tech_advisor', 'counselor', 
                       'economic_advisor', 'healthcare_advisor', 'environmental_advisor', 'intelligence_advisor'];
    
    advisorIds.forEach(advisorId => {
        const indicator = document.getElementById(`typing-${advisorId}`);
        if (indicator) {
            console.log(`Removing remaining typing indicator for ${advisorId}`);
            indicator.remove();
        }
    });
}

function updateWorldState(worldState) {
    if (!worldState) return;
    
    worldStatusContainer.innerHTML = '';
    
    Object.entries(worldState).forEach(([key, value]) => {
        if (key === 'timestamp') return;
        
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const statusClass = getStatusClass(value);
        
        statusItem.innerHTML = `
            <span class="status-label">${label}</span>
            <span class="status-value ${statusClass}">${value}</span>
        `;
        
        worldStatusContainer.appendChild(statusItem);
    });
}

function enableDecisionInput() {
    decisionInput.disabled = false;
    sendButton.disabled = false;
    decisionInput.placeholder = "Type your decision...";
    isWaitingForResponse = false;
    decisionInput.focus();
}

function disableDecisionInput() {
    decisionInput.disabled = true;
    sendButton.disabled = true;
    decisionInput.placeholder = "Processing...";
    isWaitingForResponse = true;
}

// Event handlers
function sendDecision() {
    const decision = decisionInput.value.trim();
    if (!decision || isWaitingForResponse) return;
    
    processDecision(decision);
    decisionInput.value = '';
}

// Auto-resize textarea
decisionInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle Enter key
decisionInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDecision();
    }
});

// Utility functions
function getAvatarClass(role) {
    if (role.toLowerCase().includes('defense') || role.toLowerCase().includes('security')) {
        return 'avatar-defense';
    } else if (role.toLowerCase().includes('treasury') || role.toLowerCase().includes('economic')) {
        return 'avatar-treasury';
    } else {
        return 'avatar-staff';
    }
}

// Display advisor reactions to decisions
function displayAdvisorReactions(reactions) {
    reactions.forEach((reaction, index) => {
        setTimeout(() => {
            const advisor = availableAdvisors.find(a => a.id === reaction.advisorId);
            const advisorName = advisor ? advisor.name : 'Unknown Advisor';
            
            const reactionMessage = document.createElement('div');
            reactionMessage.className = 'message advisor-reaction';
            reactionMessage.innerHTML = `
                <div class="advisor-header">
                    <strong>💬 ${advisorName} reacts:</strong>
                </div>
                <div class="advisor-content">
                    ${reaction.content}
                </div>
            `;
            
            messagesContainer.appendChild(reactionMessage);
            scrollToBottom();
        }, index * 800);
    });
}

function getAvatarClassByName(name) {
    if (name.includes('General Jake Sullivan-Peters')) return 'avatar-defense';
    if (name.includes('DJ Vans')) return 'avatar-staff';
    if (name.includes('Ilon Tusk')) return 'avatar-tech';
    if (name.includes('Kellyanne Conway-Smith')) return 'avatar-counselor';
    return 'avatar-staff';
}

function getAvatarInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getStatusClass(value) {
    if (value <= 20) return 'status-critical';
    if (value <= 40) return 'status-warning';
    if (value >= 70) return 'status-good';
    return 'status-neutral';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// TTS Audio playback functionality
let currentAudio = null;

function playAdvisorAudio(audioUrl, buttonElement) {
    console.log('🎤 [Audio] Playing advisor audio:', audioUrl);
    
    // Stop any currently playing audio
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    const statusDiv = buttonElement.parentElement.querySelector('.audio-status');
    const loadingSpan = statusDiv.querySelector('.loading');
    const playingSpan = statusDiv.querySelector('.playing');
    const errorSpan = statusDiv.querySelector('.error');
    
    // Show status and loading
    statusDiv.style.display = 'block';
    loadingSpan.style.display = 'inline';
    playingSpan.style.display = 'none';
    errorSpan.style.display = 'none';
    buttonElement.disabled = true;
    buttonElement.textContent = '⏳ Loading...';
    
    // Create and play audio
    currentAudio = new Audio(audioUrl);
    
    currentAudio.addEventListener('loadstart', () => {
        console.log('🎤 [Audio] Load started');
    });
    
    currentAudio.addEventListener('canplay', () => {
        console.log('🎤 [Audio] Can play - starting playback');
        loadingSpan.style.display = 'none';
        playingSpan.style.display = 'inline';
        buttonElement.textContent = '▶️ Playing';
    });
    
    currentAudio.addEventListener('ended', () => {
        console.log('🎤 [Audio] Playback ended');
        statusDiv.style.display = 'none';
        buttonElement.disabled = false;
        buttonElement.textContent = '🔊 Play';
        currentAudio = null;
    });
    
    currentAudio.addEventListener('error', (e) => {
        console.error('🎤 [Audio] Playback error:', e);
        loadingSpan.style.display = 'none';
        playingSpan.style.display = 'none';
        errorSpan.style.display = 'inline';
        buttonElement.disabled = false;
        buttonElement.textContent = '❌ Error';
        currentAudio = null;
    });
    
    currentAudio.play().catch(error => {
        console.error('🎤 [Audio] Play failed:', error);
        statusDiv.style.display = 'none';
        buttonElement.disabled = false;
        buttonElement.textContent = '❌ Error';
        currentAudio = null;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Disable decision input initially
    disableDecisionInput();
});
