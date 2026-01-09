// Simple TypeScript file with basic functions for testing
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

function calculateSum(a: number, b: number): number {
  return a + b;
}

export const multiply = (x: number, y: number): number => {
  return x * y;
}

function processData(): void {
  const result = calculateSum(5, 10);
  const greeting = greet("World");
  const product = multiply(3, 4);
  
  console.log(greeting, result, product);
}