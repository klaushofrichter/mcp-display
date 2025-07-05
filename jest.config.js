export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/server/**/*.js',
    '!src/server/index.js'
  ]
} 