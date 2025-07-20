// Signal-style Agent Stage Game Interface
let gameSession = null;
let currentEvent = null;
let isWaitingForResponse = false;

// Start the game
async function startGame() {
    // Prevent multiple clicks
    if (gameSession) {
        console.log('Game already started, ignoring duplicate start request');
        return;
    }
    
    // Switch from welcome screen to chat interface by adding active class
    const chatMain = document.getElementById('chat-main');
    if (chatMain) {
        chatMain.classList.add('active');
    }
    
    // Show loading message
    addMessage('Establishing secure connection to the Oval Office...', 'system');
    
    try {
        const response = await fetch('/api/game/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: 'president_' + Date.now()
            })
        });
        
        const data = await response.json();
        console.log('Game started:', data);
        
        if (data.session && data.session.sessionId) {
            gameSession = data.session.sessionId;
            
            // Update world state from initial data
            updateWorldStatusMini(data.gameState.worldState);
            
            // Show welcome message
            addMessage('🏛️ Connection established. You are now President of the United States.', 'system');
            
            // Check if there's an event
            let eventToDisplay = data.gameState.currentEvent || 
                (data.session.events && data.session.events.length > 0 ? data.session.events[0] : null);
            
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
        addMessage('⚠️ Failed to establish connection. Please refresh and try again.', 'system');
    }
}

// Generate a new event
async function generateEvent() {
    if (!gameSession) return;
    
    try {
        addMessage('📋 Intelligence briefing incoming...', 'system');
        
        const response = await fetch('/api/game/new-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('New event generated:', data);
        
        if (data.event) {
            currentEvent = data.event;
            displayEvent(currentEvent);
            
            // Get advisor responses after displaying the event
            setTimeout(() => {
                getAdvisorResponses();
            }, 1500);
        }
    } catch (error) {
        console.error('Error generating event:', error);
        addMessage('⚠️ Failed to receive intelligence briefing. Please try again.', 'system');
    }
}

// Display event in Signal-style format
function displayEvent(event) {
    if (!event) return;
    
    // Update urgency indicator
    const urgencyIndicator = document.getElementById('urgency-indicator');
    if (urgencyIndicator) {
        urgencyIndicator.className = `urgency-indicator urgency-${event.urgency}`;
    }
    
    // Add event message with crisis styling
    const eventMessage = `
        🚨 **URGENT BRIEFING**
        
        **${event.title}**
        
        ${event.description}
        
        **Potential Consequences:**
        ${event.potentialConsequences.map(c => `• ${c}`).join('\n')}
    `;
    
    addMessage(eventMessage, 'system', '', event.audioUrl);
    
    // Clear notification badge when event is displayed
    updateNotificationBadge(0);
}

// Get advisor responses
async function getAdvisorResponses() {
    if (!gameSession || !currentEvent) return;
    
    try {
        addMessage('💬 Consulting with your advisory team...', 'system');
        
        const response = await fetch('/api/game/state', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Game state retrieved:', data);
        
        if (data.advisorMessages && data.advisorMessages.length > 0) {
            displayAdvisorMessages(data.advisorMessages, data.availableAdvisors);
            updateWorldStatusMini(data.worldState);
        }
        
        enableDecisionInput();
    } catch (error) {
        console.error('Error getting advisor responses:', error);
        addMessage('⚠️ Unable to reach advisory team. Please try again.', 'system');
        enableDecisionInput();
    }
}

// Display advisor messages in Signal style
function displayAdvisorMessages(messages, availableAdvisors = []) {
    if (!messages || messages.length === 0) return;
    
    messages.forEach((message, index) => {
        setTimeout(() => {
            const advisorName = getAdvisorDisplayName(message.advisorId);
            addMessage(message.content, 'advisor', advisorName, message.audioUrl);
        }, index * 800); // Stagger advisor responses
    });
}

// Get display name for advisor
function getAdvisorDisplayName(advisorId) {
    const advisorNames = {
        'chief_staff': 'DJ Vans',
        'national_security': 'Gen. Sullivan-Peters',
        'tech_advisor': 'Ilon Tusk',
        'counselor': 'Kellyanne Conway-Smith',
        'economic_advisor': 'Dr. Janet Powell-Summers',
        'healthcare_advisor': 'Dr. Anthony Birx-Fauci',
        'environmental_advisor': 'Alexandria Green-Cortez',
        'intelligence_advisor': 'Dir. Sarah Haspel-Burns'
    };
    return advisorNames[advisorId] || 'Presidential Advisor';
}

// Send decision
async function sendDecision() {
    console.log('🔄 sendDecision() called');
    const messageInput = document.getElementById('message-input');
    const decision = messageInput.value.trim();
    
    console.log('📝 Decision text:', decision);
    console.log('🎮 Game session:', gameSession);
    console.log('📋 Current event:', currentEvent);
    console.log('⏳ Waiting for response:', isWaitingForResponse);
    
    if (!decision || !gameSession || !currentEvent || isWaitingForResponse) {
        console.log('❌ sendDecision aborted - missing requirements');
        return;
    }
    
    // Disable input while processing
    isWaitingForResponse = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButton(false);
    
    // Add user message
    addMessage(decision, 'user', 'President');
    
    try {
        // Show processing message
        addMessage('🤔 Analyzing decision impact...', 'system');
        
        const response = await fetch('/api/game/decision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: currentEvent.id,
                action: decision,
                reasoning: 'Presidential decision based on advisor consultation'
            })
        });
        
        console.log('📡 API Response status:', response.status);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Decision processed response:', data);
        console.log('🔍 Response structure:');
        console.log('  - data.result:', !!data.result);
        console.log('  - data.result.consequence:', !!data.result?.consequence);
        console.log('  - data.result.advisorReactions:', data.result?.advisorReactions?.length || 0);
        console.log('  - data.result.nextEvent:', !!data.result?.nextEvent);
        console.log('  - data.gameState.recentMessages:', data.gameState?.recentMessages?.length || 0);
        
        if (data.result && data.result.consequence) {
            console.log('✅ Processing consequences...');
            displayConsequences(data.result.consequence);
            updateWorldStatusMini(data.result.newWorldState || data.gameState.worldState);
            
            // Display advisor reactions to the decision
            if (data.result.advisorReactions && data.result.advisorReactions.length > 0) {
                console.log('👥 Displaying advisor reactions...');
                setTimeout(() => {
                    displayAdvisorReactions(data.result.advisorReactions);
                }, 1000);
            }
            
            // If there's a new event, display it
            if (data.result.nextEvent) {
                console.log('🆕 New event received:', data.result.nextEvent.title);
                currentEvent = data.result.nextEvent;
                setTimeout(() => {
                    displayEvent(currentEvent);
                    // Check if we have advisor responses in the game state
                    if (data.gameState && data.gameState.recentMessages && data.gameState.recentMessages.length > 0) {
                        console.log('📨 Using advisor responses from game state');
                        setTimeout(() => {
                            displayAdvisorMessages(data.gameState.recentMessages, data.gameState.availableAdvisors);
                            enableDecisionInput();
                        }, 1500);
                    } else {
                        console.log('📨 Getting fresh advisor responses');
                        setTimeout(() => {
                            getAdvisorResponses();
                        }, 1500);
                    }
                }, 3000); // Longer delay to allow for advisor reactions first
            } else {
                console.log('📋 No new event - keeping current event');
            }
        } else {
            console.log('⚠️ No consequence data in response');
        }
    } catch (error) {
        console.error('Error processing decision:', error);
        addMessage('⚠️ Unable to process decision. Please try again.', 'system');
    } finally {
        isWaitingForResponse = false;
        enableDecisionInput();
    }
}

// Display consequences
function displayConsequences(consequence) {
    let consequenceText = '📊 **DECISION IMPACT**\n\n';
    
    if (consequence && consequence.impact) {
        // Summary section
        if (consequence.impact.summary) {
            consequenceText += '**SUMMARY:**\n';
            consequenceText += consequence.impact.summary + '\n\n';
        }
        
        // Public reaction section with better formatting
        if (consequence.impact.publicReaction) {
            consequenceText += '**PUBLIC REACTION:**\n';
            // Split long text into paragraphs for better readability
            const reaction = consequence.impact.publicReaction;
            const sentences = reaction.split('. ');
            let formattedReaction = '';
            let currentParagraph = '';
            
            sentences.forEach((sentence, index) => {
                if (sentence.trim()) {
                    currentParagraph += sentence.trim();
                    if (index < sentences.length - 1) currentParagraph += '. ';
                    
                    // Start new paragraph every 2-3 sentences or at 200 characters
                    if (currentParagraph.length > 200 || (index > 0 && (index + 1) % 3 === 0)) {
                        formattedReaction += currentParagraph + '\n\n';
                        currentParagraph = '';
                    }
                }
            });
            
            // Add remaining text
            if (currentParagraph.trim()) {
                formattedReaction += currentParagraph;
            }
            
            consequenceText += formattedReaction + '\n\n';
        }
        
        // Parameter changes with better visual formatting
        if (consequence.impact.parameterChanges) {
            consequenceText += '**NATIONAL IMPACT:**\n';
            consequenceText += formatStatChanges(consequence.impact.parameterChanges) + '\n';
        }
        
        // Future events
        if (consequence.cascadeEvents && consequence.cascadeEvents.length > 0) {
            consequenceText += '**POTENTIAL FUTURE EVENTS:**\n';
            consequenceText += consequence.cascadeEvents.map(event => `• ${event}`).join('\n');
        }
    }
    
    addMessage(consequenceText, 'system');
}

// Display advisor reactions to decisions
function displayAdvisorReactions(advisorReactions) {
    if (!advisorReactions || advisorReactions.length === 0) return;
    
    addMessage('👥 **ADVISOR REACTIONS TO YOUR DECISION**', 'system');
    
    advisorReactions.forEach((reaction, index) => {
        const advisorName = getAdvisorDisplayName(reaction.advisorId);
        setTimeout(() => {
            addMessage(reaction.content, 'advisor', advisorName, reaction.audioUrl);
        }, (index + 1) * 1000); // Stagger reactions by 1 second each
    });
}

// Format stat changes for display
function formatStatChanges(parameterChanges) {
    if (!parameterChanges) return '';
    
    const changes = [];
    for (const [param, value] of Object.entries(parameterChanges)) {
        if (value !== 0) {
            const sign = value > 0 ? '+' : '';
            const paramName = param.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const emoji = value > 0 ? '📈' : '📉';
            changes.push(`${emoji} **${paramName}**: ${sign}${value}`);
        }
    }
    
    if (changes.length > 0) {
        // Format in two columns for better readability
        const formatted = changes.join('\n');
        return `${formatted}\n`;
    }
    
    return '';
}

// Enable/disable decision input
function enableDecisionInput() {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = "Make your presidential decision...";
    }
    updateSendButton(true);
}

function disableDecisionInput() {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = "Processing...";
    }
    updateSendButton(false);
}

// Update send button state
function updateSendButton(enabled) {
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.disabled = !enabled;
        sendButton.style.opacity = enabled ? '1' : '0.5';
    }
}

// Play audio function
function playAudio(audioUrl) {
    if (!audioUrl) return;
    
    // Stop any currently playing audio
    const existingAudio = document.querySelector('audio');
    if (existingAudio) {
        existingAudio.pause();
        existingAudio.remove();
    }
    
    // Create and play new audio
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.log('Audio playback failed:', e));
    
    // Clean up audio element when done
    audio.addEventListener('ended', () => {
        audio.remove();
    });
}

// Add message to chat (defined in HTML, but ensuring it exists)
if (typeof addMessage === 'undefined') {
    function addMessage(content, type = 'system', sender = '', audioUrl = '', timestamp = new Date()) {
        const messages = document.getElementById('messages');
        if (!messages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        let avatarClass = 'system-avatar';
        let senderName = sender;
        
        if (type === 'user') {
            avatarClass = 'user-avatar';
            senderName = 'President';
        } else if (type === 'advisor') {
            avatarClass = 'advisor-avatar';
        }
        
        const timeStr = timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let avatarContent = '🤖';
        if (type === 'user') avatarContent = 'RG';
        else if (type === 'advisor') avatarContent = sender.charAt(0);
        
        messageDiv.innerHTML = `
            <div class="message-avatar ${avatarClass}">
                ${avatarContent}
            </div>
            <div class="message-content">
                ${senderName ? `<div class="message-sender">${senderName}</div>` : ''}
                <div class="message-text">${content}</div>
                ${audioUrl ? `<button class="play-button" onclick="playAudio('${audioUrl}')">🔊 Play</button>` : ''}
                <div class="message-time">${timeStr}</div>
            </div>
        `;
        
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
        
        // Update notification badge if not user message
        if (type !== 'user') {
            const currentBadgeCount = parseInt(document.getElementById('oval-office-notifications').textContent || '0');
            updateNotificationBadge(currentBadgeCount + 1);
        }
    }
}

// Update world status mini panel (defined in HTML, ensuring it exists)
if (typeof updateWorldStatusMini === 'undefined') {
    function updateWorldStatusMini(worldState) {
        if (!worldState) return;
        
        const elements = {
            'economy-mini': worldState.economy,
            'trust-mini': worldState.publicTrust,
            'military-mini': worldState.military,
            'global-mini': worldState.globalReputation
        };
        
        for (const [elementId, value] of Object.entries(elements)) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
                element.className = 'status-mini-value';
                
                if (value >= 80) element.classList.add('status-good');
                else if (value >= 60) element.classList.add('status-neutral');
                else if (value >= 40) element.classList.add('status-warning');
                else element.classList.add('status-critical');
            }
        }
    }
}

// Update notification badge (defined in HTML, ensuring it exists)  
if (typeof updateNotificationBadge === 'undefined') {
    function updateNotificationBadge(count) {
        const badge = document.getElementById('oval-office-notifications');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Auto-resize textarea
    const input = document.getElementById('message-input');
    if (input) {
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Enter (not Shift+Enter)
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDecision();
            }
        });
    }
    
    // Enable send button when there's text
    if (input) {
        input.addEventListener('input', function() {
            const sendButton = document.getElementById('send-button');
            if (sendButton) {
                sendButton.disabled = this.value.trim() === '' || isWaitingForResponse;
            }
        });
    }
});

// Export functions for HTML onclick handlers
window.startGame = startGame;
window.sendDecision = sendDecision;
window.playAudio = playAudio;
window.addMessage = addMessage;
window.updateWorldStatusMini = updateWorldStatusMini;
window.updateNotificationBadge = updateNotificationBadge;
