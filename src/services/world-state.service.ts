import { WorldState, Consequence } from '../types';

export class WorldStateManager {
  private state: WorldState;
  private readonly stateHistory: { state: WorldState; timestamp: Date }[] = [];

  constructor(initialState: WorldState) {
    this.state = { ...initialState };
    this.saveStateSnapshot();
  }

  /**
   * Get current world state
   */
  getCurrentState(): WorldState {
    return { ...this.state };
  }

  /**
   * Update world state with consequences
   */
  applyConsequence(consequence: Consequence): WorldState {
    // Apply parameter changes immediately
    this.applyParameterChanges(consequence.impact.parameterChanges);
    
    this.saveStateSnapshot();
    return this.getCurrentState();
  }

  /**
   * Apply parameter changes with bounds checking
   */
  private applyParameterChanges(changes: Partial<WorldState>): void {
    for (const [parameter, change] of Object.entries(changes)) {
      if (change && parameter in this.state) {
        this.state[parameter] = Math.max(0, Math.min(100, this.state[parameter] + change));
      }
    }
  }

  /**
   * Check if any parameters are in critical state
   */
  getCriticalParameters(): { parameter: string; value: number }[] {
    return Object.entries(this.state)
      .filter(([_, value]) => value < 20)
      .map(([parameter, value]) => ({ parameter, value }));
  }

  /**
   * Get parameters that are performing well
   */
  getStrongParameters(): { parameter: string; value: number }[] {
    return Object.entries(this.state)
      .filter(([_, value]) => value > 80)
      .map(([parameter, value]) => ({ parameter, value }));
  }

  /**
   * Calculate overall stability score
   */
  getStabilityScore(): number {
    const values = Object.values(this.state);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    
    // Higher variance means less stability
    return Math.max(0, 100 - Math.sqrt(variance));
  }

  /**
   * Save a snapshot of current state for history tracking
   */
  private saveStateSnapshot(): void {
    this.stateHistory.push({
      state: { ...this.state },
      timestamp: new Date()
    });

    // Keep only last 50 snapshots
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history for analytics
   */
  getStateHistory(): { state: WorldState; timestamp: Date }[] {
    return [...this.stateHistory];
  }

  /**
   * Revert to a previous state (for testing or special events)
   */
  revertToSnapshot(snapshotIndex: number): WorldState {
    if (snapshotIndex >= 0 && snapshotIndex < this.stateHistory.length) {
      this.state = { ...this.stateHistory[snapshotIndex].state };
      this.saveStateSnapshot();
    }
    return this.getCurrentState();
  }

  /**
   * Get formatted state report for display
   */
  getStateReport(): string {
    const critical = this.getCriticalParameters();
    const strong = this.getStrongParameters();
    const stability = this.getStabilityScore();

    let report = `World State Report\n==================\n`;
    report += `Overall Stability: ${stability.toFixed(1)}/100\n\n`;

    report += `Parameters:\n`;
    Object.entries(this.state).forEach(([param, value]) => {
      let status: string;
      if (value < 20) {
        status = '🔴';
      } else if (value < 40) {
        status = '🟡';
      } else if (value > 80) {
        status = '🟢';
      } else {
        status = '⚪';
      }
      report += `${status} ${param}: ${value}/100\n`;
    });

    if (critical.length > 0) {
      report += `\n⚠️ Critical Areas: ${critical.map(c => c.parameter).join(', ')}\n`;
    }

    if (strong.length > 0) {
      report += `\n✅ Strong Areas: ${strong.map(s => s.parameter).join(', ')}\n`;
    }

    return report;
  }
}
