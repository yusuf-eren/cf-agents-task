#!/bin/bash

# Test script to verify the workspace setup

echo "🧪 Testing Cloudflare Agents Workspace setup..."

# Check if shared package builds
echo "📦 Testing shared package build..."
cd packages/shared
if npm run build; then
    echo "✅ Shared package builds successfully"
else
    echo "❌ Shared package build failed"
    exit 1
fi

cd ../..

# Check if backend compiles
echo "🔧 Testing backend compilation..."
cd apps/backend
if npm run build; then
    echo "✅ Backend compiles successfully"
else
    echo "❌ Backend compilation failed"
    exit 1
fi

cd ../..

# Check if frontend compiles
echo "🎨 Testing frontend compilation..."
cd apps/frontend
if npm run build; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

cd ../..

echo ""
echo "🎉 All tests passed! The workspace is set up correctly."
echo ""
echo "To start development:"
echo "  Backend:  cd apps/backend && npm run dev"
echo "  Frontend: cd apps/frontend && npm run dev"