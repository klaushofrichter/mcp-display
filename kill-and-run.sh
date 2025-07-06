#!/bin/zsh
pkill -f "node.*index.js"
pkill -f "node.* vite"
sleep 1
lsof -ti :8080
npm run dev
