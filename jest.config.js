const nodeModules = require('./scripts/nodeModules.js')

module.exports = {
  transform: {
    '.(ts)$': 'ts-jest',
  },
  modulePaths: nodeModules.find(__dirname),
  cacheDirectory: '<rootDir>/cache/jest',
  testRegex: '\\.test\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  timers: 'fake',
  verbose: false,
}
