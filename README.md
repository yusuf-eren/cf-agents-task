# Cloudflare Agents Workspace

A Turborepo monorepo for Cloudflare Agents with intelligent Gateway routing and agent switching capabilities.

## Architecture

This workspace is organized as a monorepo with the following structure:

```
cf-agents-workspace/
├── apps/
│   ├── backend/          # Cloudflare Worker with agents
│   └── frontend/         # React frontend application
├── packages/
│   └── shared/           # Shared utilities and types
├── turbo.json           # Turborepo configuration
└── package.json         # Root package.json with workspaces
```

## Features

### 🤖 **Dual Agent System**

- **Auto Agent**: General-purpose assistant with weather, time, and scheduling capabilities
- **Campaign Agent**: Specialized for marketing campaigns, strategy development, and automation

### 🌐 **Intelligent Gateway Routing**

- Centralized request routing through Gateway
- WebSocket connections directly to agents (bypassing Gateway for reliability)
- Multiple routing strategies: URL patterns, headers, query parameters
- Fallback mechanisms for robust operation

### 🔄 **Real-time Agent Switching**

- Seamless switching between agent types in the UI
- Persistent agent preferences
- Connection status monitoring
- Automatic reconnection handling

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Build shared packages**

   ```bash
   npm run build
   ```

3. **Start development servers**

   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start individually
   npm run backend:dev
   npm run frontend:dev
   ```

4. **Configure environment**
   Copy `.dev.vars.example` to `.dev.vars` in `apps/backend/` and set your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Deployment

1. **Deploy backend to Cloudflare**

   ```bash
   npm run backend:deploy
   ```

2. **Build frontend**
   ```bash
   npm run frontend:build
   ```

## Available Scripts

### Root Level

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages and apps
- `npm run lint` - Lint all code
- `npm run test` - Run all tests
- `npm run format` - Format all code

### Backend Specific

- `npm run backend:dev` - Start backend development server
- `npm run backend:deploy` - Deploy backend to Cloudflare

### Frontend Specific

- `npm run frontend:dev` - Start frontend development server
- `npm run frontend:build` - Build frontend for production

## Workspace Structure

### Apps

#### Backend (`apps/backend/`)

- **Purpose**: Cloudflare Worker with AI agents and Gateway routing
- **Technology**: Cloudflare Workers, Durable Objects, AI SDK
- **Key Features**:
  - Chat and Campaign agents
  - Gateway intelligent routing
  - WebSocket support
  - Tool execution with human-in-the-loop

#### Frontend (`apps/frontend/`)

- **Purpose**: React web application for agent interaction
- **Technology**: React 19, Vite, TailwindCSS
- **Key Features**:
  - Agent type switching
  - Real-time chat interface
  - Connection status monitoring
  - Responsive design

### Packages

#### Shared (`packages/shared/`)

- **Purpose**: Common utilities, types, and constants
- **Exports**:
  - Agent types and utilities
  - Connection status types
  - Shared constants
  - Helper functions

## Agent Routing

### Request Flow

```
Client Request → Main Worker → {
  ├── System endpoints (/check-open-ai-key) → Direct handling
  ├── Gateway routes (/gateway/*, /api/gateway/*) → Gateway routing
  ├── API endpoints (/api/*) → Direct API handling
  └── All other requests → Standard agent routing
}
```

### Agent Types

- **chat**: General-purpose agent for weather, time, scheduling
- **campaign-agent**: Specialized for marketing and campaigns

### Routing Examples

```bash
# Direct agent connections (WebSocket)
/agents/chat/session-123
/agents/campaign-agent/marketing-team

# Gateway routing
/gateway/agents/campaign/smart-route

# API endpoints
/api/health
/api/status
```

## Development Tips

### Adding New Shared Utilities

1. Add to `packages/shared/src/index.ts`
2. Build the shared package: `npm run build --filter=@cf-agents/shared`
3. Import in apps: `import { utility } from "@cf-agents/shared"`

### Creating New Agents

1. Add agent class to `apps/backend/src/server.ts`
2. Update wrangler.jsonc durable object bindings
3. Add routing logic to Gateway
4. Update frontend agent options

### Debugging

- Use `npm run dev` to start both frontend and backend
- Check browser console for frontend issues
- Check Wrangler logs for backend issues
- Use the debug toggle in the UI for detailed message inspection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the established patterns
4. Test your changes: `npm run test`
5. Lint your code: `npm run lint`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
