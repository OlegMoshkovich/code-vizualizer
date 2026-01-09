// Intentionally broken TypeScript for testing error handling

// Missing closing brace
function brokenFunction(x: number {
  return x + 1;
}

// Invalid syntax
const invalid = function(a: number, b: string;
  return a + b;
};

// Unmatched parentheses
export function unmatched(x: number): number {
  return (x + 1;
}

// Invalid type annotation
function badType(x: invalidType): void {
  console.log(x);
}

// Missing semicolon and quotes
const message = "Hello world
console.log(message)

// Invalid arrow function
const arrow = (x: number) => {
  return x * 2
  // Missing closing brace