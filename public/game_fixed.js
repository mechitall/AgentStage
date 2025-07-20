// Fixed stat changes display for better visibility
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
        return `\n\n💫 **NATIONAL IMPACT:**\n\n${changes.join('\n\n')}`;
    }
    
    return '';
}

// Export for use in main game.js
window.formatStatChanges = formatStatChanges;
