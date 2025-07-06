# MCP Display

A local MCP (Model Context Protocol) server supporting HTTP transport that offers tools for MCP clients to display text, image, and SVG content in a web browser interface.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Software Structure](#software-structure)
- [Usage](#usage)
- [Testing](#testing)
- [Development](#development)
- [API Reference](#api-reference)

## Installation

### Prerequisites

- Node.js 20.19.0 or higher
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-display
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers for testing (optional)**
   ```bash
   npm run test:install
   ```

## Configuration

### Environment Variables

The application supports the following environment variables:

- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment mode (development/production)

### Server Configuration

The server is configured to:
- Run on port 8080 by default
- Accept HTTP requests from any origin (CORS enabled)
- Handle JSON payloads up to 50MB (for large base64 images)
- Serve static files from the `dist` directory
- Provide WebSocket connectivity for real-time updates

## Software Structure

```
mcp-display/
├── src/
│   ├── server/
│   │   └── index.js           # Main MCP server with HTTP transport
│   └── client/
│       ├── index.html         # Main HTML file
│       ├── main.js           # Vue app entry point
│       └── App.vue           # Main Vue component
├── tests/
│   ├── api/
│   │   └── mcp-server.test.js # Jest API tests
│   └── e2e/
│       └── app.spec.js       # Playwright E2E tests
├── dist/                     # Built frontend (generated)
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── jest.config.js           # Jest configuration
├── playwright.config.js     # Playwright configuration
└── README.md               # This file
```

### Architecture Overview

The application follows a client-server architecture:

#### Server (Node.js)
- **MCP Server**: Implements the Model Context Protocol with HTTP transport
- **Express API**: Provides REST endpoints for the web interface
- **WebSocket Server**: Enables real-time communication with the browser
- **Tool Handlers**: Processes `display_text`, `display_image`, and `display_svg` MCP tool calls

#### Client (Vue 3)
- **Vue 3 Composition API**: Modern reactive frontend framework
- **Single Page Application**: Built with Vite for fast development
- **WebSocket Client**: Receives real-time updates from the server
- **Responsive Design**: Works on desktop and mobile devices

### Key Components

#### MCP Server (`src/server/index.js`)
- **MCPDisplayServer Class**: Main server class managing all functionality
- **Express Setup**: HTTP server with CORS, JSON parsing, and static file serving
- **WebSocket Setup**: Real-time communication with browser clients
- **MCP Tool Registration**: Implements `display_text`, `display_image`, and `display_svg` tools
- **Connection Logging**: Tracks all MCP client interactions

#### Vue Frontend (`src/client/App.vue`)
- **Display Area**: Shows text or image content from MCP clients
- **Sidebar**: Connection log with timestamps and previews
- **Clear Button**: Allows manual clearing of displayed content
- **WebSocket Integration**: Receives real-time updates from the server
- **Responsive Layout**: Adapts to different screen sizes

## Usage

### Starting the Server

#### Development Mode
```bash
npm run dev
```
This starts both the server and client in development mode with hot reloading.

#### Production Mode
```bash
npm run build
npm start
```

### Accessing the Interface

1. Open your browser and navigate to `http://localhost:3000`
2. You'll see the MCP Display interface with:
   - Main display area (initially empty)
   - Sidebar with connection log
   - Clear button to reset the display

### Using MCP Tools

The server provides three MCP tools that clients can use:

#### display_text
Displays text content in the browser.

**Parameters:**
- `text` (string, required): The text to display

**Example MCP request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "display_text",
    "arguments": {
      "text": "Hello, World!\nThis is a multi-line text display."
    }
  }
}
```

#### display_image
Displays a base64-encoded image in the browser.

**Parameters:**
- `imageData` (string, required): Base64-encoded image data
- `mimeType` (string, optional): MIME type of the image (default: "image/png")

**Example MCP request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "display_image",
    "arguments": {
      "imageData": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "mimeType": "image/png"
    }
  }
}
```

#### display_svg
Displays SVG graphics in the browser.

**Parameters:**
- `svgData` (string, required): SVG markup data
- `title` (string, optional): Optional title for the SVG

**Example MCP request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "display_svg",
    "arguments": {
      "svgData": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"blue\"/></svg>",
      "title": "Blue Circle"
    }
  }
}
```

### Demo Script

The project includes a demo script that showcases all three display capabilities:

```bash
./demo.sh
```

This script will:
1. Check server health before proceeding
2. Clear any existing content
3. Display sample text content with formatting
4. Show colorful SVG graphics with gradients and shapes
5. Display the water lily image from the public directory
6. Add a completion message with technical details

The demo script is a great way to test all functionality and see the different content types in action.

### MCP Client Integration

To use this server with an MCP client, configure the client to connect to:
- **HTTP Endpoint**: `http://localhost:3000/mcp` (proxied to MCP server)
- **Transport**: HTTP POST requests with JSON-RPC 2.0 format

## Testing

The project includes comprehensive testing with both unit/integration tests (Jest) and end-to-end tests (Playwright).

### Running Tests

#### API Tests (Jest)
```bash
npm test
```
Tests server functionality, API endpoints, and MCP tool validation.

#### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
Tests the complete application flow including UI interactions and WebSocket communication.

#### Install Playwright Browsers
```bash
npm run test:install
```

### Test Coverage

#### API Tests (`tests/api/mcp-server.test.js`)
- API endpoint validation
- MCP tool functionality (text, image, and SVG)
- WebSocket connection handling
- Error handling

#### E2E Tests (`tests/e2e/app.spec.js`)
- UI component rendering
- Content display (text, images, and SVG)
- Connection log functionality
- WebSocket communication
- Error handling and recovery
- Responsive design

#### GET /api/content
Returns the currently displayed content.

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "type": "text|image|svg",
      "data": "content data",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "mimeType": "image/png", // only for images
      "title": "Optional title" // only for SVG
    }
  ]
}
```

#### GET /api/connections
Returns the connection log.

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "tool": "display_text|display_image|display_svg",
      "preview": "content preview"
    }
  ]
}
```

## Development

### Scripts

- `npm run dev`: Start development server with hot reloading
- `npm run server:dev`: Start only the server in development mode
- `npm run client:dev`: Start only the client development server
- `npm run build`: Build production version
- `npm run preview`: Preview production build
- `npm test`: Run Jest tests
- `npm run test:e2e`: Run Playwright E2E tests

### Development Setup

1. **Install dependencies**: `npm install`
2. **Start development server**: `npm run dev`
3. **Open browser**: Navigate to `http://localhost:3000` (all services are proxied through this port)

### Code Structure Guidelines

- **Server code**: Pure JavaScript (no TypeScript) following Node.js best practices
- **Client code**: Vue 3 Composition API with single-file components
- **Styling**: Scoped CSS with modern design principles
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Code style**: Readable and maintainable code over performance optimization

## API Reference

### REST Endpoints

#### GET /api/health
Returns server health status and statistics.

**Response:**
```json
{
  "status": "healthy",
  "uptime": "123s",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "server": "mcp-display-server",
  "stats": {
    "contentItems": 5,
    "connections": 10,
    "websocketClients": 2
  }
}
```

#### GET /api/content
Returns the currently displayed content.

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "type": "text|image|svg",
      "data": "content data",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "mimeType": "image/png", // only for images
      "title": "Optional title" // only for SVG
    }
  ]
}
```

#### GET /api/connections
Returns the connection log.

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "tool": "display_text|display_image|display_svg",
      "preview": "content preview"
    }
  ]
}
```

#### POST /api/clear
Clears the displayed content.

**Response:**
```json
{
  "success": true
}
```

#### POST /mcp
MCP HTTP transport endpoint for tool calls.

**Request:** Standard JSON-RPC 2.0 MCP request
**Response:** Standard JSON-RPC 2.0 MCP response

### WebSocket Events

#### Client → Server
- Connection establishment (automatic)

#### Server → Client
- `content`: New content to display
- `connection`: New connection log entry
- `clear`: Clear display command

### MCP Tools

#### display_text
- **Name**: `display_text`
- **Description**: Display text content in the browser
- **Input**: `{ text: string }`
- **Output**: Success confirmation with preview

#### display_image
- **Name**: `display_image`
- **Description**: Display base64 encoded image in the browser
- **Input**: `{ imageData: string, mimeType?: string }`
- **Output**: Success confirmation with MIME type

#### display_svg
- **Name**: `display_svg`
- **Description**: Display SVG graphics in the browser
- **Input**: `{ svgData: string, title?: string }`
- **Output**: Success confirmation with SVG preview

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions, please refer to the project's issue tracker or documentation.
