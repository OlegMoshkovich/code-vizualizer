// Edge cases for TypeScript parsing
export default function defaultExport(): string {
  return "I'm the default export";
}

// IIFE (Immediately Invoked Function Expression)
(function() {
  console.log('IIFE executed');
})();

// Recursive function
export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Function with destructured parameters
export function processConfig({ 
  host, 
  port = 3000, 
  ssl = false 
}: { 
  host: string; 
  port?: number; 
  ssl?: boolean 
}): string {
  return `${ssl ? 'https' : 'http'}://${host}:${port}`;
}

// Function with rest parameters
export function combine(separator: string, ...items: string[]): string {
  return items.join(separator);
}

// Closure example
export function createCounter(initial: number = 0): () => number {
  let count = initial;
  
  function increment(): number {
    count += 1;
    return count;
  }
  
  return increment;
}

// Nested functions
export function outer(x: number): (y: number) => number {
  function inner(y: number): number {
    return x + y;
  }
  
  return inner;
}

// Function with complex generics
export function transform<T, U>(
  items: T[],
  mapper: (item: T, index: number) => U
): U[] {
  return items.map(mapper);
}

// Anonymous function assigned to variable
export const asyncProcessor = async (data: unknown[]): Promise<unknown[]> => {
  const results = [];
  
  for (const item of data) {
    const processed = await processItem(item);
    results.push(processed);
  }
  
  return results;
};

// Helper for asyncProcessor
async function processItem(item: unknown): Promise<unknown> {
  return new Promise(resolve => {
    setTimeout(() => resolve(item), 10);
  });
}

// Object with methods
export const mathUtils = {
  add(a: number, b: number): number {
    return a + b;
  },
  
  subtract: (a: number, b: number): number => {
    return a - b;
  },
  
  async calculate(operation: 'add' | 'subtract', a: number, b: number): Promise<number> {
    if (operation === 'add') {
      return this.add(a, b);
    } else {
      return this.subtract(a, b);
    }
  }
};

// Class with static and instance methods
export class Calculator {
  private history: number[] = [];
  
  static isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
  }
  
  add(a: number, b: number): number {
    const result = a + b;
    this.saveToHistory(result);
    return result;
  }
  
  private saveToHistory(value: number): void {
    this.history.push(value);
    if (this.history.length > 10) {
      this.history.shift();
    }
  }
  
  getHistory(): readonly number[] {
    return [...this.history];
  }
}

// Example usage creating function calls
export function demo(): void {
  const counter = createCounter(5);
  const count1 = counter();
  const count2 = counter();
  
  const fib = fibonacci(5);
  const config = processConfig({ host: 'localhost', port: 8080 });
  const combined = combine(', ', 'a', 'b', 'c');
  
  const calc = new Calculator();
  const sum = calc.add(10, 20);
  
  console.log(count1, count2, fib, config, combined, sum);
}