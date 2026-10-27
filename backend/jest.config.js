// Two projects: fast unit specs next to the code, and end-to-end specs that need PostgreSQL (test/).
const transform = {
  '^.+\.ts$': ['ts-jest', { tsconfig: { ...require('./tsconfig.json').compilerOptions, strict: false, noImplicitAny: false } }],
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      rootDir: 'src',
      testRegex: '.*\.spec\.ts$',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform,
      testEnvironment: 'node',
    },
    {
      displayName: 'e2e',
      rootDir: 'test',
      testRegex: '.*\.e2e-spec\.ts$',
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform,
      testEnvironment: 'node',
      globalSetup: '<rootDir>/global-setup.mjs',
      globalTeardown: '<rootDir>/global-teardown.mjs',
      testTimeout: 30000,
    },
  ],
};
