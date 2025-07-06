#!/bin/zsh
claude mcp remove een-mcp
claude mcp add-json een-mcp '{"type":"stdio","command":"node","args":["src/index.js"],"cwd":"/Users/klaushofrichter/Development/een-mcp"}'
claude mcp remove display-http
claude mcp add-json display-http '{"type":"http","url":"http://localhost:3000/mcp"}'
