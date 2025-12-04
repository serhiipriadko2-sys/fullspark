#!/bin/bash
# IskraSpaceApp - Quick Start Script

set -e

echo "🌌 Starting Iskra Space App..."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️  .env.local not found. Creating from .env.example..."
        cp .env.example .env.local
        echo ""
        echo "⚠️  IMPORTANT: Edit .env.local and add your GEMINI_API_KEY"
        echo "   Get your API key from: https://aistudio.google.com/apikey"
        echo ""
        echo "   Run this script again after adding your API key."
        exit 1
    else
        echo "❌ No .env.example found. Creating template..."
        cat > .env.local << 'EOF'
# Gemini API Key (Required)
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Gemini Model
GEMINI_MODEL=gemini-3.0-pro-latest
EOF
        echo ""
        echo "⚠️  Created .env.local template"
        echo "   Please edit it and add your GEMINI_API_KEY"
        echo "   Get your key from: https://aistudio.google.com/apikey"
        exit 1
    fi
fi

# Check if GEMINI_API_KEY is set
source .env.local
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-gemini-api-key-here" ]; then
    echo "❌ GEMINI_API_KEY not configured in .env.local"
    echo "   Please edit .env.local and add your API key"
    echo "   Get your key from: https://aistudio.google.com/apikey"
    exit 1
fi

echo "✅ GEMINI_API_KEY configured"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Dependencies installed"
echo ""

# Start the development server
echo "🚀 Starting development server..."
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
