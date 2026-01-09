// Complex TypeScript file with various patterns for testing
import { EventEmitter } from 'events';

/**
 * Interface for user data
 */
interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Generic utility type
 */
type Result<T> = Promise<T | null>;

/**
 * Main UserService class
 */
export class UserService extends EventEmitter {
  private users: Map<number, User> = new Map();
  
  constructor(private apiUrl: string) {
    super();
  }

  /**
   * Fetches a user by ID
   */
  async getUser(id: number): Promise<User | null> {
    const cached = this.getUserFromCache(id);
    if (cached) {
      return cached;
    }

    try {
      const user = await this.fetchUserFromAPI(id);
      if (user) {
        this.cacheUser(user);
        this.emit('user:fetched', user);
      }
      return user;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Gets user from local cache
   */
  private getUserFromCache(id: number): User | null {
    return this.users.get(id) || null;
  }

  /**
   * Fetches user from remote API
   */
  private async fetchUserFromAPI(id: number): Promise<User | null> {
    const response = await fetch(`${this.apiUrl}/users/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Caches user locally
   */
  private cacheUser(user: User): void {
    this.users.set(user.id, user);
    this.cleanup();
  }

  /**
   * Handles errors
   */
  private handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('UserService error:', message);
    this.emit('error', message);
  }

  /**
   * Cleanup old cached users
   */
  private cleanup(): void {
    if (this.users.size > 100) {
      const oldest = Array.from(this.users.keys())[0];
      this.users.delete(oldest);
    }
  }
}

/**
 * Factory function for creating user service
 */
export function createUserService(config: { apiUrl: string; timeout?: number }): UserService {
  return new UserService(config.apiUrl);
}

/**
 * Async utility function with generics
 */
export async function processUsers<T extends User>(
  users: T[], 
  processor: (user: T) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  
  for (const user of users) {
    try {
      const processed = await processor(user);
      results.push(processed);
    } catch (error) {
      console.error(`Failed to process user ${user.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Higher-order function
 */
export const withRetry = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3
): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          break;
        }
        await delay(Math.pow(2, attempt) * 100); // Exponential backoff
      }
    }
    
    throw lastError!;
  }) as T;
};

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage example that creates function calls
export async function example(): Promise<void> {
  const service = createUserService({ apiUrl: 'https://api.example.com' });
  const user = await service.getUser(1);
  
  if (user) {
    const processed = await processUsers([user], async (u) => ({ ...u, processed: true }));
    console.log('Processed:', processed);
  }
}