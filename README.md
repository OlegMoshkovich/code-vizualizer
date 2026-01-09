# TypeScript Function Visualizer

A Next.js application that visualizes TypeScript code as interactive function graphs. Users can paste URLs to TypeScript files and see their function relationships visualized using React Flow.

## 🚀 Project Status

**Phase 1: Basic Setup & Foundation** ✅ **COMPLETED**
**Phase 2: Code Parsing & Analysis** ✅ **COMPLETED**

### Completed Phases
- **Phase 1**: URL input, validation, code fetching, and foundational architecture
- **Phase 2**: TypeScript parsing, AST analysis, function extraction, and graph building

### Upcoming Phases
- **Phase 3**: Enhanced interactive visualization and advanced features

## 📋 Features

### ✅ Phase 1: Foundation
- **URL Input Component**: Clean, accessible interface for pasting TypeScript file URLs
- **URL Validation**: Comprehensive validation with support for GitHub, Gist, and direct file URLs
- **Code Fetching**: Robust HTTP client with error handling, timeout, and file size limits
- **TypeScript Support**: Full TypeScript integration with strict mode
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Testing Suite**: Comprehensive test coverage with Jest and React Testing Library
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

### ✅ Phase 2: Code Analysis
- **TypeScript Parser**: Advanced AST parsing using Babel with TypeScript support
- **Function Extraction**: Extracts all function types (declarations, arrows, methods, async)
- **Call Relationship Mapping**: Tracks function calls and dependencies
- **React Flow Integration**: Converts parsed data to interactive graph format
- **Automatic Layout**: Multiple layout algorithms (hierarchical, horizontal, circular)
- **API Endpoints**: RESTful API for code parsing with rate limiting
- **Comprehensive Testing**: 80+ test cases covering parsing, graphs, and API routes
- **Error Handling**: Graceful handling of syntax errors and malformed code

### 🔧 Technical Architecture

```
src/
├── types/           # TypeScript type definitions
│   ├── index.ts     # Core types (FunctionData, ParseError, etc.)
│   └── index.test.ts
├── components/      # React components
│   ├── URLInput.tsx # URL input and validation component
│   └── URLInput.test.tsx
├── lib/            # Core parsing and analysis modules
│   ├── utils.ts    # URL validation and code fetching
│   ├── utils.test.ts
│   ├── codeParser.ts      # TypeScript AST parsing engine
│   ├── codeParser.test.ts # 67+ parser test cases
│   ├── graphBuilder.ts    # React Flow graph generation
│   ├── graphBuilder.test.ts
│   ├── layoutEngine.ts    # Automatic graph layout algorithms
│   ├── layoutEngine.test.ts
│   └── __fixtures__/      # Test fixtures for various TS patterns
│       ├── simple.ts      # Basic functions and calls
│       ├── complex.ts     # Classes, async, generics
│       ├── edge-cases.ts  # IIFE, closures, recursion
│       └── invalid.ts     # Broken syntax for error testing
└── app/            # Next.js app router
    ├── layout.tsx         # App layout with React Flow CSS
    ├── page.tsx          # Main application with graph visualization
    └── api/parse-code/   # REST API for code analysis
        ├── route.ts      # Parse endpoint with rate limiting
        └── route.test.ts # API integration tests
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing
```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Build
```bash
npm run build
npm run start
```

## 📝 Usage

### Phase 1 & 2 Features
1. **Paste a TypeScript file URL** into the input field
2. **Click "Analyze"** to fetch and parse the code
3. **View the interactive graph** showing function relationships
4. **Explore parsing results** including metadata and function details
5. **Use JSON preview** for detailed analysis data

### Graph Visualization
- **Interactive Nodes**: Functions displayed as styled nodes with type information
- **Relationship Edges**: Arrows showing function call dependencies
- **Automatic Layout**: Smart positioning using multiple layout algorithms
- **Function Metadata**: Parameters, return types, async status, export information
- **Visual Categories**: Different styles for exported, async, and class methods

### Supported URL Types

- **GitHub Files**: `https://github.com/user/repo/blob/main/file.ts` (auto-converted to raw)
- **GitHub Raw**: `https://raw.githubusercontent.com/user/repo/main/file.ts`
- **GitHub Gists**: `https://gist.github.com/user/gist-id` (auto-converted to raw)
- **Direct URLs**: Any direct link to `.ts` or `.tsx` files

### Constraints

- Maximum file size: 500KB
- Supported extensions: `.ts`, `.tsx`
- CORS restrictions may apply to some URLs
- Network timeout: 10 seconds

## 🧪 Testing

### Comprehensive Test Coverage
- **Types**: Type guards and interface validation
- **Components**: User interactions, accessibility, error states
- **Utilities**: URL validation, HTTP fetching, error handling
- **Parser Engine**: 67+ test cases covering AST parsing, function extraction, error handling
- **Graph Builder**: Node/edge creation, filtering, graph manipulation
- **Layout Engine**: Automatic positioning algorithms and viewport centering
- **API Routes**: Request validation, rate limiting, error responses, integration tests
- **Test Fixtures**: Real-world TypeScript patterns for comprehensive validation

### Running Tests
```bash
# All tests
npm run test

# Specific test files
npm run test src/components/URLInput.test.tsx
npm run test src/lib/utils.test.ts

# Coverage report
npm run test:coverage
```

### Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## 🏗️ Architecture Decisions

### TypeScript First
- Strict TypeScript configuration
- Comprehensive type definitions
- Runtime type guards for validation

### Component Design
- Composable, reusable components
- Props-based configuration
- Accessible by default

### Error Handling
- Graceful degradation
- User-friendly error messages
- Network resilience

### Testing Strategy
- Unit tests for utilities
- Component testing with React Testing Library
- Mocked HTTP requests for predictable testing

## 📦 Dependencies

### Core Dependencies
- **Next.js 16**: App Router, React 19
- **TypeScript**: Strict mode configuration
- **Tailwind CSS**: Utility-first styling
- **@xyflow/react**: Graph visualization (ready for Phase 2)
- **Axios**: HTTP client for code fetching

### Phase 2 Dependencies
- **@babel/parser**: TypeScript AST parsing
- **@babel/traverse**: AST traversal  
- **@babel/types**: AST type definitions
- **dagre**: Automatic graph layout algorithms

### Development Dependencies
- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction testing
- **@testing-library/jest-dom**: Custom Jest matchers

## 🔄 Development Workflow

### Code Quality
```bash
npm run lint     # ESLint
npm run test     # Jest tests
npm run build    # Production build
```

### Git Workflow
- Feature branches from `main`
- Comprehensive commit messages
- Test coverage required

## 🎯 Next Steps (Phase 3)

1. **Enhanced Visualization**
   - Interactive graph controls (zoom, pan, filter)
   - Advanced node styling and animations
   - Minimap and overview panels

2. **Advanced Analysis**
   - Complexity metrics and code quality indicators  
   - Dependency analysis and circular dependency detection
   - Performance bottleneck identification

3. **Export & Sharing**
   - Graph export (PNG, SVG, PDF)
   - Shareable visualization URLs
   - Integration with development tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure test coverage >80%
5. Submit a pull request

## 📄 License

[MIT License](LICENSE)

## 🏷️ Version History

- **v0.1.0**: Phase 1 - Basic Setup & Foundation
  - URL input and validation
  - Code fetching infrastructure
  - Testing framework
  - Project architecture

- **v0.2.0**: Phase 2 - Code Parsing & Analysis
  - TypeScript AST parsing with Babel
  - Function extraction and call relationship mapping
  - React Flow graph generation with automatic layout
  - REST API endpoints with rate limiting
  - Comprehensive test suite (80+ test cases)
  - Interactive graph visualization
