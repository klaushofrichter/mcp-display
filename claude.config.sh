#!/bin/zsh
claude mcp remove display-http
claude mcp add-json display-http '{"type":"http","url":"http://localhost:3000/mcp"}'
