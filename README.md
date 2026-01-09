# TypeScript Function Visualizer

A Next.js application that visualizes TypeScript code as interactive function graphs. Users can paste URLs to TypeScript files and see their function relationships visualized using React Flow.

## 🚀 Project Status

**Phase 1: Basic Setup & Foundation** ✅ **COMPLETED**

This phase includes URL input, validation, code fetching, and foundational architecture.

### Upcoming Phases
- **Phase 2**: TypeScript parsing and AST analysis (Babel integration)
- **Phase 3**: Interactive graph visualization with React Flow

## 📋 Features (Phase 1)

### ✅ Completed Features

- **URL Input Component**: Clean, accessible interface for pasting TypeScript file URLs
- **URL Validation**: Comprehensive validation with support for GitHub, Gist, and direct file URLs
- **Code Fetching**: Robust HTTP client with error handling, timeout, and file size limits
- **TypeScript Support**: Full TypeScript integration with strict mode
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Testing Suite**: Comprehensive test coverage with Jest and React Testing Library
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

### 🔧 Technical Architecture

```
src/
├── types/           # TypeScript type definitions
│   ├── index.ts     # Core types (FunctionData, ParseError, etc.)
│   └── index.test.ts
├── components/      # React components
│   ├── URLInput.tsx # URL input and validation component
│   └── URLInput.test.tsx
├── lib/            # Utility functions
│   ├── utils.ts    # URL validation and code fetching
│   └── utils.test.ts
└── app/            # Next.js app router
    ├── layout.tsx  # App layout with React Flow CSS
    └── page.tsx    # Main application page
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

## 📝 Usage (Phase 1)

1. **Paste a TypeScript file URL** into the input field
2. **Click "Analyze"** to fetch and validate the code
3. **View the results** including file information and code preview
4. **See placeholder** for future graph visualization

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

### Test Coverage
- **Types**: Type guards and interface validation
- **Components**: User interactions, accessibility, error states
- **Utilities**: URL validation, HTTP fetching, error handling

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

### Development Dependencies
- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction testing
- **@testing-library/jest-dom**: Custom Jest matchers

### Future Dependencies (Phase 2)
- **@babel/parser**: TypeScript AST parsing
- **@babel/traverse**: AST traversal
- **@babel/types**: AST type definitions

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

## 🎯 Next Steps (Phase 2)

1. **TypeScript Parser Integration**
   - Implement Babel parser for AST generation
   - Extract function definitions and calls
   - Handle TypeScript-specific syntax

2. **Function Analysis**
   - Identify function parameters and return types
   - Map function call relationships
   - Extract JSDoc comments

3. **Error Handling**
   - Parse errors and syntax issues
   - Graceful degradation for partial analysis

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
