/**
 * Node-environment unit tests for the pure logic under lib/ — the status
 * derivations and input normalizers that drive dashboard counts and form
 * validation. Component rendering is not covered here.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/*.test.ts'],
};
