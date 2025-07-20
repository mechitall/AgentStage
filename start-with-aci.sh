#!/bin/bash

# Agent Stage + ACI.dev Free Tier Quick Setup
echo "🎭 Agent Stage + ACI.dev Free Tier Setup"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file first"
    exit 1
fi

echo "✅ .env file found"

# Check for OpenAI API key
if grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "✅ OpenAI API key configured"
else
    echo "⚠️  OpenAI API key not configured"
    echo "   Add your OpenAI API key to .env"
fi

# Check for ACI.dev configuration
if grep -q "ACI_API_KEY=your_aci_api_key_here" .env; then
    echo "🆓 ACI.dev FREE TIER setup needed:"
    echo ""
    echo "1. Sign up free at: https://platform.aci.dev/"
    echo "2. Create a project and agent (free!)"
    echo "3. Configure BRAVE_SEARCH and GITHUB apps"
    echo "4. Get your API key and linked account owner ID"
    echo "5. Update the ACI_API_KEY in your .env file"
    echo "6. Update the ACI_LINKED_ACCOUNT_OWNER_ID in your .env file"
    echo ""
    echo "📖 See ACI_FREE_TIER_GUIDE.md for detailed instructions"
    echo ""
else
    echo "✅ ACI.dev API key configured"
fi

echo ""
echo "🚀 Starting Agent Stage..."
echo ""

# Build and start the server
npm run build
if [ $? -eq 0 ]; then
    echo ""
    echo "🎮 Agent Stage is ready!"
    echo "🌐 Open http://localhost:3000"
    echo "🎭 Experience AI advisors with real-world intelligence!"
    echo ""
    npm start
else
    echo "❌ Build failed. Please check for errors."
    exit 1
fi
