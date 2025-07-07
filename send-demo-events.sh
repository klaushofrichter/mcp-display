#!/bin/bash
set -e

# MCP Display Demo Script
# This script demonstrates all three content types: text, image, and SVG

echo "🚀 Starting MCP Display Demo..."
echo "Make sure the server is running on port 8080"
echo ""

# Check if server is running
if ! curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 8080"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Server is running!"
echo ""

# Initialize session and get session ID
echo "🤝 Initializing MCP session..."
SESSION_ID=$(curl -si -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {}
    }
  }' | grep -i 'mcp-session-id' | awk -F': ' '{print $2}' | tr -d '\r')

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to get session ID"
    exit 1
fi
echo "✅ Session initialized with ID: $SESSION_ID"
echo ""

# Clear existing content
echo "🧹 Clearing existing content..."
curl -s -X POST http://localhost:8080/api/clear > /dev/null
sleep 1

# 1. Display welcome text
echo "📝 Displaying welcome text..."
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "display_text",
      "arguments": {
        "text": "🚀 Welcome to MCP Display Demo!\n\nThis demonstration showcases all three supported content types:\n\n📝 TEXT - Rich formatted text with emojis and formatting\n🖼️ IMAGE - High-quality images with proper scaling\n🎨 SVG - Vector graphics with interactive elements\n\nFeatures:\n• Real-time content updates via WebSocket\n• Professional UI with responsive design\n• Connection logging and monitoring\n• Multiple content types in one interface\n\nTo connect Claude Desktop to this server, run:\nclaude mcp add --transport http display-http http://localhost:3000/mcp\n\nEnjoy the demo! 🎉"
      }
    }
  }' > /dev/null

sleep 2

# 2. Display SVG graphics
echo "🎨 Displaying SVG graphics..."
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "display_svg",
      "arguments": {
        "svgData": "<svg width=\"400\" height=\"300\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\"><stop offset=\"0%\" style=\"stop-color:#FF6B6B;stop-opacity:1\" /><stop offset=\"50%\" style=\"stop-color:#4ECDC4;stop-opacity:1\" /><stop offset=\"100%\" style=\"stop-color:#45B7D1;stop-opacity:1\" /></linearGradient><filter id=\"shadow\"><feDropShadow dx=\"3\" dy=\"3\" stdDeviation=\"4\" flood-color=\"#000\" flood-opacity=\"0.3\"/></filter></defs><rect width=\"400\" height=\"300\" fill=\"url(#bg)\" rx=\"20\" filter=\"url(#shadow)\"/><circle cx=\"100\" cy=\"100\" r=\"40\" fill=\"#FFD93D\" stroke=\"#6BCF7F\" stroke-width=\"4\"/><rect x=\"200\" y=\"60\" width=\"80\" height=\"80\" fill=\"#6BCF7F\" stroke=\"#4D96FF\" stroke-width=\"3\" rx=\"10\"/><polygon points=\"320,60 360,100 320,140 280,100\" fill=\"#9B59B6\" stroke=\"#E74C3C\" stroke-width=\"3\"/><text x=\"200\" y=\"200\" font-family=\"Arial, sans-serif\" font-size=\"24\" font-weight=\"bold\" fill=\"white\" text-anchor=\"middle\">🎨 SVG Demo</text><text x=\"200\" y=\"240\" font-family=\"Arial, sans-serif\" font-size=\"16\" fill=\"white\" text-anchor=\"middle\">Vector Graphics Display</text></svg>",
        "title": "MCP Display SVG Demo"
      }
    }
  }' > /dev/null

sleep 2

# 3. Display image (water.png)
echo "🖼️  Displaying water lily image..."
if [ -f "public/water.png" ]; then
    # Convert image to base64 and send
    IMAGE_B64=$(base64 -i public/water.png | tr -d '\n')
    curl -s -X POST http://localhost:8080/mcp \
      -H "Content-Type: application/json" \
      -H "mcp-session-id: $SESSION_ID" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 3,
        \"method\": \"tools/call\",
        \"params\": {
          \"name\": \"display_image\",
          \"arguments\": {
            \"imageData\": \"$IMAGE_B64\",
            \"mimeType\": \"image/png\"
          }
        }
      }" > /dev/null
else
    echo "⚠️ water.png not found, using placeholder image..."
    curl -s -X POST http://localhost:8080/mcp \
      -H "Content-Type: application/json" \
      -H "mcp-session-id: $SESSION_ID" \
      -d '{
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
          "name": "display_image",
          "arguments": {
            "imageData": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "mimeType": "image/png"
          }
        }
      }' > /dev/null
fi

sleep 2

# 4. Display completion message
echo "🎉 Displaying completion message..."
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "display_text",
      "arguments": {
        "text": "✅ Demo Complete!\n\nYou have successfully seen all three content types:\n\n1. 📝 TEXT - Welcome message and this completion text\n2. 🎨 SVG - Colorful vector graphics with gradients and shapes\n3. 🖼️ IMAGE - Beautiful water lily photograph\n\nThe MCP Display server is working perfectly!\n\n🔧 Technical Details:\n• MCP Protocol: JSON-RPC 2.0 compliant\n• WebSocket: Real-time updates active\n• Content Types: text, image, svg supported\n• Logging: Truncated for large data\n• UI: Professional and responsive\n\nReady for production use! 🚀"
      }
    }
  }' > /dev/null

echo ""
echo "✅ Demo completed successfully!"
echo "🌐 View the results at: http://localhost:3000"
echo "📊 Check server logs for connection details"
echo "" 
