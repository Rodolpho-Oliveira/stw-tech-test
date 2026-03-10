/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    // Pin React to the web app's own node_modules (React 19) to avoid
    // conflicts with React 18 that sits at the monorepo root
    "^react$": "<rootDir>/node_modules/react",
    "^react/(.*)$": "<rootDir>/node_modules/react/$1",
    "^react-dom$": "<rootDir>/node_modules/react-dom",
    "^react-dom/(.*)$": "<rootDir>/node_modules/react-dom/$1",
    // Path aliases
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@industrial/types$": "<rootDir>/../../packages/types/src/index.ts",
    // Browser-API-dependent mocks
    "recharts": "<rootDir>/src/test/__mocks__/recharts.tsx",
    "next/font/google": "<rootDir>/src/test/__mocks__/next-font.ts",
    "^next/navigation$": "<rootDir>/src/test/__mocks__/next-navigation.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/test/**",
    "!src/app/layout.tsx",
  ],
};

module.exports = config;
