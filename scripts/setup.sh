#!/bin/bash

# Setup script for Cloudflare Agents Workspace

echo "🚀 Setting up Cloudflare Agents Workspace..."

# Install turbo globally if not present
if ! command -v turbo &> /dev/null; then
    echo "📦 Installing Turbo globally..."
    npm install -g turbo
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared packages
echo "🔨 Building shared packages..."
cd packages/shared && npm run build && cd ../..

# Setup backend environment
echo "⚙️ Setting up backend environment..."
if [ ! -f "apps/backend/.dev.vars" ]; then
  cp apps/backend/.dev.vars.example apps/backend/.dev.vars
  echo "📝 Created apps/backend/.dev.vars - please add your OpenAI API key"
fi

# Create public directory for backend
mkdir -p apps/backend/public

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to apps/backend/.dev.vars"
echo "2. Run individual services:"
echo "   - Backend: cd apps/backend && npm run dev"
echo "   - Frontend: cd apps/frontend && npm run dev"
echo "3. Visit http://localhost:3000 for the frontend"
echo "4. Backend will be available at http://localhost:8787"