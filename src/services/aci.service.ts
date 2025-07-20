interface ACIToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

interface ACIToolDefinition {
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface ACISearchRequest {
  query: string;
  limit?: number;
}

interface ACIExecuteRequest {
  function_name: string;
  arguments: Record<string, any>;
  linked_account_owner_id: string;
  allowed_apps_only?: boolean;
}

export class ACIService {
  private readonly apiKey: string;
  private readonly linkedAccountOwnerId: string;
  private readonly baseUrl: string = 'https://api.aci.dev';
  private readonly availableTools: Map<string, ACIToolDefinition> = new Map();

  constructor() {
    this.apiKey = process.env.ACI_API_KEY || '';
    this.linkedAccountOwnerId = process.env.ACI_LINKED_ACCOUNT_OWNER_ID || 'agent_stage_user';
    this.initializeCommonTools();
  }

  private async apiRequest(endpoint: string, data?: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`ACI API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`ACI API request failed: ${error}`);
      throw error;
    }
  }

  private initializeCommonTools() {
    // Initialize common tools that are available on ACI.dev's generous free tier
    const commonTools: Record<string, ACIToolDefinition> = {
      'BRAVE_SEARCH__WEB_SEARCH': {
        function: {
          name: 'BRAVE_SEARCH__WEB_SEARCH',
          description: 'Search the web using Brave Search API - Available on ACI.dev FREE TIER',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              count: {
                type: 'number',
                description: 'Number of results to return (max 10 on free tier)',
                default: 5,
                maximum: 10
              }
            },
            required: ['query']
          }
        }
      },
      'GITHUB__SEARCH_REPOSITORIES': {
        function: {
          name: 'GITHUB__SEARCH_REPOSITORIES',
          description: 'Search GitHub repositories - Available on ACI.dev FREE TIER',
          parameters: {
            type: 'object',
            properties: {
              q: {
                type: 'string',
                description: 'Search query'
              },
              sort: {
                type: 'string',
                description: 'Sort results by',
                enum: ['stars', 'forks', 'updated'],
                default: 'stars'
              },
              per_page: {
                type: 'number',
                description: 'Results per page (max 30 on free tier)',
                default: 5,
                maximum: 30
              }
            },
            required: ['q']
          }
        }
      },
      'GITHUB__GET_REPOSITORY': {
        function: {
          name: 'GITHUB__GET_REPOSITORY',
          description: 'Get detailed information about a specific GitHub repository - FREE TIER',
          parameters: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner'
              },
              repo: {
                type: 'string', 
                description: 'Repository name'
              }
            },
            required: ['owner', 'repo']
          }
        }
      }
    };

    Object.entries(commonTools).forEach(([name, tool]) => {
      this.availableTools.set(name, tool);
    });
    
    console.log(`🆓 [ACI] Initialized ${Object.keys(commonTools).length} FREE TIER tools available`);
  }

  /**
   * Search for available tools based on query (mock implementation)
   */
  async searchTools(query: string, limit: number = 5): Promise<ACIToolDefinition[]> {
    try {
      // For now, return relevant tools from our common tools based on query
      const relevantTools = Array.from(this.availableTools.values()).filter(tool => 
        tool.function.description.toLowerCase().includes(query.toLowerCase()) ||
        tool.function.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);

      return relevantTools;
    } catch (error) {
      console.error('Error searching ACI tools:', error);
      return [];
    }
  }

  /**
   * Execute a tool call through ACI API
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('ACI service not properly configured. Check API key and linked account owner ID.');
      }

      // Mock execution for common tools until we have proper API access
      return this.mockToolExecution(toolName, args);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw new Error(`Tool execution failed: ${error}`);
    }
  }

  /**
   * Mock tool execution for demonstration purposes - simulates ACI.dev FREE TIER responses
   */
  private async mockToolExecution(toolName: string, args: Record<string, any>): Promise<any> {
    // Simulate realistic API response times for free tier
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
    
    switch (toolName) {
      case 'BRAVE_SEARCH__WEB_SEARCH':
        return {
          results: [
            {
              title: `Breaking: ${args.query} - Latest Developments`,
              snippet: `Recent updates on ${args.query}. This is a mock result showing what ACI.dev's FREE TIER Brave Search would return. The actual service provides real-time web search results.`,
              url: 'https://example.com/breaking-news',
              published_date: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              favicon: '🌐'
            },
            {
              title: `Expert Analysis: ${args.query} Impact`,
              snippet: `Comprehensive analysis of ${args.query} implications. ACI.dev FREE TIER provides up to 10 search results per query with generous daily limits.`,
              url: 'https://example.com/expert-analysis',
              published_date: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
              favicon: '📊'
            },
            {
              title: `Official Response to ${args.query}`,
              snippet: `Government and institutional responses. Real ACI.dev integration would show current official statements and policy responses.`,
              url: 'https://example.com/official-response',
              published_date: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
              favicon: '🏛️'
            }
          ],
          query: args.query,
          total_results: 847,
          search_metadata: {
            engine: 'Brave Search via ACI.dev FREE TIER',
            processed_time: `${(Math.random() * 0.5 + 0.1).toFixed(3)}s`
          }
        };

      case 'GITHUB__SEARCH_REPOSITORIES': {
        const topics = args.q.toLowerCase().split(' ');
        return {
          total_count: Math.floor(Math.random() * 5000) + 100,
          incomplete_results: false,
          items: [
            {
              name: `${topics[0]}-${topics[1] || 'solution'}`,
              full_name: `research-org/${topics[0]}-${topics[1] || 'solution'}`,
              description: `Advanced ${args.q} implementation with comprehensive documentation. This mock shows what ACI.dev's FREE TIER GitHub integration returns.`,
              stargazers_count: Math.floor(Math.random() * 10000) + 500,
              forks_count: Math.floor(Math.random() * 2000) + 100,
              language: ['TypeScript', 'Python', 'JavaScript', 'Go'][Math.floor(Math.random() * 4)],
              html_url: `https://github.com/research-org/${topics[0]}-solution`,
              updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              topics: topics.slice(0, 3)
            },
            {
              name: `official-${topics[0]}`,
              full_name: `government/${topics[0]}-official`,
              description: `Official ${args.q} reference implementation used by institutions. ACI.dev FREE TIER includes GitHub search with generous limits.`,
              stargazers_count: Math.floor(Math.random() * 3000) + 200,
              forks_count: Math.floor(Math.random() * 800) + 50,
              language: ['Python', 'C++', 'Java'][Math.floor(Math.random() * 3)],
              html_url: `https://github.com/government/${topics[0]}-official`,
              updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
              topics: [`official-${topics[0]}`, 'government', 'policy']
            }
          ],
          search_metadata: {
            engine: 'GitHub API via ACI.dev FREE TIER',
            rate_limit_remaining: Math.floor(Math.random() * 4000) + 1000
          }
        };
      }

      case 'GITHUB__GET_REPOSITORY':
        return {
          name: args.repo,
          full_name: `${args.owner}/${args.repo}`,
          description: `Repository details for ${args.repo}. ACI.dev FREE TIER provides detailed repository information including stats, languages, and recent activity.`,
          stargazers_count: Math.floor(Math.random() * 15000) + 1000,
          forks_count: Math.floor(Math.random() * 3000) + 200,
          watchers_count: Math.floor(Math.random() * 500) + 50,
          language: 'TypeScript',
          topics: ['government', 'policy', 'analysis', 'official'],
          html_url: `https://github.com/${args.owner}/${args.repo}`,
          clone_url: `https://github.com/${args.owner}/${args.repo}.git`,
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          pushed_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
          license: {
            name: 'MIT License',
            spdx_id: 'MIT'
          }
        };

      default:
        return {
          message: `Mock execution of ${toolName} via ACI.dev FREE TIER`,
          arguments: args,
          timestamp: new Date().toISOString(),
          note: 'Configure ACI.dev API key for real tool execution with generous free tier limits!'
        };
    }
  }

  /**
   * Get tools relevant to a specific advisor role
   */
  async getAdvisorTools(advisorRole: string): Promise<ACIToolDefinition[]> {
    const toolQueries = this.getToolQueriesForAdvisor(advisorRole);
    const allTools: ACIToolDefinition[] = [];
    
    for (const query of toolQueries) {
      const tools = await this.searchTools(query, 3);
      allTools.push(...tools);
    }
    
    // Remove duplicates
    const uniqueTools = Array.from(
      new Map(allTools.map(tool => [tool.function.name, tool])).values()
    );
    
    return uniqueTools;
  }

  /**
   * Define tool search queries based on advisor role
   */
  private getToolQueriesForAdvisor(advisorRole: string): string[] {
    const roleQueries: Record<string, string[]> = {
      'DJ Vans': ['search', 'communication', 'social'],
      'General': ['search', 'security', 'defense'],
      'Ilon Tusk': ['search', 'technology', 'github'],
      'Kellyanne': ['search', 'research', 'data'],
      'Chief of Staff': ['search', 'organization', 'coordination']
    };

    return roleQueries[advisorRole] || ['search'];
  }

  /**
   * Get pre-defined tools for common operations
   */
  getCommonTools(): string[] {
    return Array.from(this.availableTools.keys());
  }

  /**
   * Check if ACI service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.linkedAccountOwnerId);
  }

  /**
   * Get all cached tool definitions
   */
  getCachedTools(): ACIToolDefinition[] {
    return Array.from(this.availableTools.values());
  }

    /**
   * Get tool definition by name
   */
  getToolDefinition(toolName: string): ACIToolDefinition | null {
    return this.availableTools.get(toolName) || null;
  }
}

export default ACIService;
