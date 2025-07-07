# MCP Display Product Requirements Document

## Functionality
* We create a local MCP server that supports HTTP transport
* The server is locally run on MacOS
* When launched, the MCP server offers a port where a browser can connect
* The MCP server offers these tools to MCP clients:
  * Text display: the MCP client provides simple ASCII text that is then shown in a conected browser
  * Image display: the MCP client provides base64 encoded image data that is then shown in the connected browser
  * SVG display: the MCP client provides an SVG object that is shown in the connected browser
* There is a button on the screen that clears the window
* There is a sidebar that shows a log of MCP client connections
* We build a single page web application 

# Implementation 
* We use NodeJS 20.19 or better, we do not use typescript
* We use VUE3 composition API with vite

# Documentation
* We create an detailed README.md, including these sections:
  * installation
  * configuration
  * software structure
  * test

# Testing
* We use playwright for application tests
  * Chromium tests are sufficient
* We use jest for api tests
* We implement unit tests where applicable

# Other Infornation
* We use best practices for software design and project structure
* We prefer readability of code over efficiency and performance
* We use only well known 3rd party software packages, and use the latest stabke version
* We do not edit the prd.md file
