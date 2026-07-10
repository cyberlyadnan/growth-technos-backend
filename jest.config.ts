import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/tests/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  testTimeout: 120_000,
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^uuid$': '<rootDir>/src/tests/mocks/uuid.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/tests/**'],
  coverageDirectory: 'coverage',
  verbose: true,
};

export default config;
