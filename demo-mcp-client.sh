#!/bin/bash

# Demo: How MCP Clients Display Content in Browser
# This shows the three ways MCP clients can display content

echo "🌐 MCP Client to Browser Display Demo"
echo "======================================"
echo ""

# Start the server if not running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "📦 Starting MCP Display Server..."
    echo "   (In real usage, this would already be running)"
    echo ""
fi

echo "🎯 How MCP Clients Display Content:"
echo ""

# 1. Text Display
echo "1️⃣ DISPLAY TEXT"
echo "   MCP clients call: display_text"
echo "   Purpose: Show rich text, markdown, logs, etc."
echo "   Example:"
echo '   → Tool: display_text'
echo '   → Args: {"text": "Hello from MCP client!"}'
echo "   → Result: Text appears in browser instantly"
echo ""

# 2. Image Display  
echo "2️⃣ DISPLAY IMAGE"
echo "   MCP clients call: display_image"
echo "   Purpose: Show photos, charts, screenshots, etc."
echo "   Example:"
echo '   → Tool: display_image'
echo '   → Args: {"imageData": "base64data...", "mimeType": "image/png"}'
echo "   → Result: Image appears in browser instantly"
echo ""

# 3. SVG Display
echo "3️⃣ DISPLAY SVG"
echo "   MCP clients call: display_svg"
echo "   Purpose: Show diagrams, charts, vector graphics"
echo "   Example:"
echo '   → Tool: display_svg'
echo '   → Args: {"svgData": "<svg>...</svg>", "title": "My Chart"}'
echo "   → Result: Interactive SVG appears in browser"
echo ""

echo "🔄 Real-time Updates:"
echo "   • Content appears INSTANTLY in browser"
echo "   • Multiple clients can display simultaneously"
echo "   • WebSocket ensures real-time synchronization"
echo "   • Professional UI with connection logging"
echo ""

echo "🎮 For MCP Client Developers:"
echo "   • Connect to: http://localhost:3000/mcp"
echo "   • List tools with: tools/list"
echo "   • Call tools with: tools/call"
echo "   • View results at: http://localhost:3000"
echo ""

echo "✨ The browser becomes a SHARED DISPLAY for all MCP clients!"
echo "   Perfect for AI agents, debugging, data visualization, and more."
echo ""

# Test if we can show a working example
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "🚀 Demo: Showing content in browser now..."
    curl -s -X POST http://localhost:3000/api/test-content > /dev/null
    echo "   → Check http://localhost:3000 to see the content!"
else
    echo "💡 To see this in action:"
    echo "   1. Run: npm run dev"
    echo "   2. Open: http://localhost:3000"
    echo "   3. MCP clients can now display content instantly!"
fi 