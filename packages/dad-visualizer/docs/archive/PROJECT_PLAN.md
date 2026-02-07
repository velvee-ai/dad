# VSCode Claude Flow Visualizer - Project Plan

## Project Overview
Create a VSCode extension that captures selected code lines, sends them to Claude Code (already connected via VSCode settings), receives a structured flow chart analysis, and visualizes it using React Flow in a webview.

## Architecture Overview

### Core Components

1. **VSCode Extension Host** (Node.js environment)
   - Code selection capture from active editor
   - Claude Code CLI execution via child_process
   - Webview panel management
   - Message passing between extension and webview

2. **Claude Code Integration Layer**
   - Execute Claude CLI with selected code
   - Structured prompt templates for flow chart generation
   - JSON response parsing and validation
   - Error handling for Claude responses

3. **React Flow Webview** (Browser environment)
   - Interactive flow diagram rendering
   - Custom node components for different code elements
   - Automatic layout algorithms (Dagre/ELK.js)
   - Pan, zoom, and navigation controls

4. **Communication Protocol**
   - VSCode ↔ Claude Code: CLI via child_process.spawn()
   - Extension ↔ Webview: postMessage API
   - Structured JSON schema for flow chart data

## Technical Implementation

### Claude Code CLI Integration
```javascript
// Example of calling Claude Code from the extension
const { spawn } = require('child_process');

function analyzeCode(selectedCode) {
  const prompt = `Analyze this code and return a flow chart structure as JSON with nodes and edges...`;

  const claude = spawn('claude', [
    '-p', prompt,
    '--output-format', 'json'
  ]);

  claude.stdin.write(selectedCode);
  claude.stdin.end();

  // Parse JSON response for flow chart data
}
```

### Expected JSON Response Schema
```typescript
interface FlowChartData {
  nodes: Array<{
    id: string;
    type: 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end';
    label: string;
    description?: string;
    codeLines?: string;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: 'default' | 'conditional' | 'loop' | 'error';
    condition?: string;
  }>;
  metadata?: {
    language: string;
    complexity?: number;
    summary?: string;
  };
}
```

## Task Breakdown

### Phase 1: Foundation & Claude Integration (Week 1)

#### 1.1 VSCode Extension Setup
- [ ] Initialize VSCode extension project with TypeScript
- [ ] Configure extension manifest (package.json)
- [ ] Set up command registration for "Visualize Code Flow"
- [ ] Implement code selection capture from active editor
- [ ] Configure development environment and debugging

#### 1.2 Claude Code CLI Integration
- [ ] Test Claude CLI execution from Node.js child_process
- [ ] Implement robust spawn wrapper with error handling
- [ ] Create prompt templates for flow chart generation
- [ ] Test JSON output format parsing
- [ ] Handle authentication and Claude Code availability checks

#### 1.3 Prompt Engineering
- [ ] Design optimal prompts for different code types
- [ ] Create templates for various programming languages
- [ ] Test prompt reliability and consistency
- [ ] Document prompt patterns for best results
- [ ] Create fallback prompts for edge cases

### Phase 2: Webview & Visualization (Week 2)

#### 2.1 Webview Infrastructure
- [ ] Set up dual Webpack configuration (extension + webview)
- [ ] Create webview panel provider
- [ ] Configure React + TypeScript for webview
- [ ] Implement secure message passing protocol
- [ ] Set up content security policy

#### 2.2 React Flow Integration
- [ ] Install and configure React Flow
- [ ] Create base flow component
- [ ] Implement message handler for flow data
- [ ] Set up basic node and edge rendering
- [ ] Test with sample flow chart data

#### 2.3 Custom Node Components
- [ ] Start/End nodes with rounded styling
- [ ] Process nodes for regular statements
- [ ] Decision nodes (diamond) for conditionals
- [ ] Loop nodes with back-edge indicators
- [ ] Function call nodes with links
- [ ] Error/Exception nodes
- [ ] Parallel/Async nodes for concurrent flows

#### 2.4 Layout Algorithms
- [ ] Integrate Dagre for hierarchical layouts
- [ ] Configure ELK.js as alternative layout engine
- [ ] Add layout direction options (TB, LR, etc.)
- [ ] Implement auto-spacing and alignment
- [ ] Optimize edge routing for clarity

### Phase 3: Integration & Features (Week 3)

#### 3.1 Editor Integration
- [ ] Add context menu for code selection
- [ ] Implement command palette command
- [ ] Configure keyboard shortcuts
- [ ] Add status bar indicator
- [ ] Support multiple selections

#### 3.2 Interactive Features
- [ ] Node click to show code details
- [ ] Hover tooltips with descriptions
- [ ] Zoom controls and fit-to-view
- [ ] Mini-map for large diagrams
- [ ] Search/filter nodes
- [ ] Collapsible node groups

#### 3.3 Data Flow Enhancements
- [ ] Progressive loading for large code blocks
- [ ] Caching of Claude responses
- [ ] Incremental updates on code changes
- [ ] Diff visualization between versions
- [ ] Export diagram as SVG/PNG

#### 3.4 Multi-Language Support
- [ ] Test with JavaScript/TypeScript
- [ ] Validate Python code analysis
- [ ] Support Java/C++ code
- [ ] Handle mixed language files
- [ ] Create language-specific node styles

### Phase 4: Advanced Features (Week 4)

#### 4.1 Complex Analysis
- [ ] Multi-function flow charts
- [ ] Class/module relationship diagrams
- [ ] Async/await flow visualization
- [ ] Error handling paths
- [ ] Recursion detection and visualization

#### 4.2 Performance Optimization
- [ ] Virtual rendering for large graphs
- [ ] Lazy loading of diagram sections
- [ ] Background processing queue
- [ ] Response streaming for large analyses
- [ ] Implement request debouncing

#### 4.3 User Experience
- [ ] Loading states and progress indicators
- [ ] Error messages and recovery options
- [ ] Onboarding tutorial
- [ ] Customizable themes (light/dark)
- [ ] Accessibility improvements

### Phase 5: Testing & Documentation (Week 5)

#### 5.1 Testing
- [ ] Unit tests for extension commands
- [ ] Integration tests for Claude CLI calls
- [ ] React component tests for webview
- [ ] E2E tests for full workflow
- [ ] Performance benchmarks

#### 5.2 Documentation
- [ ] User guide with examples
- [ ] Video tutorials
- [ ] Prompt engineering guide
- [ ] Troubleshooting section
- [ ] API documentation for extensions

#### 5.3 Quality Assurance
- [ ] Code review and refactoring
- [ ] Security audit for webview
- [ ] Accessibility testing
- [ ] Cross-platform testing
- [ ] Claude Code version compatibility

### Phase 6: Release Preparation (Week 6)

#### 6.1 Publishing Setup
- [ ] Create extension icon and branding
- [ ] Write marketplace description
- [ ] Prepare demo screenshots/videos
- [ ] Set up GitHub repository
- [ ] Configure CI/CD pipeline

#### 6.2 Distribution
- [ ] Build production bundle
- [ ] Test installation process
- [ ] Publish to VSCode marketplace
- [ ] Create GitHub release
- [ ] Announce on relevant channels

## Technology Stack

### Core Dependencies
- **VSCode Extension API**: Extension host functionality
- **Node.js child_process**: Claude CLI execution
- **React 18**: Webview UI framework
- **React Flow 11**: Flow diagram visualization
- **Webpack 5**: Build system
- **TypeScript 5**: Type safety

### Layout & Visualization
- **Dagre**: Hierarchical graph layout
- **ELK.js**: Advanced layout algorithms
- **D3**: Additional layout options (optional)

### Development Tools
- **@types/vscode**: TypeScript definitions
- **@vscode/test-electron**: Extension testing
- **Jest**: Unit testing
- **React Testing Library**: Component testing
- **ESLint & Prettier**: Code quality

## Project Structure
```
react-flow-research/
├── src/
│   ├── extension/              # VSCode extension code
│   │   ├── commands/           # Command handlers
│   │   ├── providers/          # Webview provider
│   │   ├── claude/             # Claude Code integration
│   │   │   ├── client.ts       # CLI wrapper
│   │   │   ├── prompts.ts      # Prompt templates
│   │   │   └── parser.ts       # Response parser
│   │   └── extension.ts        # Entry point
│   ├── webview/                # React application
│   │   ├── components/         # React components
│   │   │   ├── nodes/          # Custom node types
│   │   │   ├── edges/          # Custom edge types
│   │   │   └── controls/       # UI controls
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Layout algorithms
│   │   ├── utils/              # Helper functions
│   │   └── App.tsx             # Main React app
│   └── shared/                 # Shared types
│       ├── types.ts            # TypeScript interfaces
│       └── schema.ts           # JSON schemas
├── webpack/
│   ├── extension.config.js     # Extension webpack
│   └── webview.config.js       # Webview webpack
├── prompts/                    # Claude prompt library
│   ├── javascript.md           # JS-specific prompts
│   ├── python.md               # Python prompts
│   └── generic.md              # Language-agnostic
├── test/                       # Test files
├── docs/                       # Documentation
└── package.json                # Extension manifest
```

## Success Metrics

### Functional Requirements
- Successfully parse and visualize code from 5+ languages
- Handle code selections from 10-500 lines
- Generate accurate flow charts 90% of the time
- Support nested functions and complex control flows

### Performance Targets
- < 2 seconds for Claude response on average code
- < 500ms to render diagram after receiving data
- Smooth interaction with graphs up to 100 nodes
- Memory usage under 200MB for typical sessions

### User Experience
- Single-click visualization from code selection
- Clear, readable diagrams without manual adjustment
- Intuitive navigation and zoom controls
- Helpful error messages when analysis fails

## Risk Mitigation

### Technical Risks
- **Claude Code unavailable**: Detect and guide user to install/connect
- **Large code analysis timeout**: Implement chunking and progressive analysis
- **Complex layouts**: Provide multiple layout algorithm options
- **API rate limits**: Add request queuing and caching

### User Experience Risks
- **Unclear diagrams**: Allow manual node repositioning
- **Slow responses**: Show progress indicators and partial results
- **Language limitations**: Clear documentation of supported languages
- **Learning curve**: Include interactive tutorial

## MVP Definition (End of Week 2)

### Core Features
- VSCode command to visualize selected code
- Claude Code integration with JSON responses
- Basic React Flow diagram in webview
- Support for JavaScript/TypeScript
- Simple hierarchical layout

### Demonstration Flow
1. User selects a function in editor
2. Right-click → "Visualize Code Flow"
3. Extension sends code to Claude Code
4. Claude returns flow chart JSON
5. Webview displays interactive diagram

## Future Enhancements

### Version 2.0
- Real-time collaboration features
- Integration with debugging sessions
- Performance profiling overlay
- Git diff flow comparisons
- Custom Claude fine-tuning for better analysis

### Version 3.0
- IDE-wide code navigation via flows
- Architecture diagram generation
- Test coverage visualization
- Documentation generation from flows
- Plugin system for custom analyzers

## Next Immediate Steps

1. **Set up extension project** with TypeScript and proper structure
2. **Test Claude CLI integration** with simple code examples
3. **Create basic webview** with React and React Flow
4. **Design JSON schema** for flow chart data exchange
5. **Implement first end-to-end** flow with simple if/else code