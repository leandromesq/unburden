import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config = {
  coverageProvider: "v8",
  collectCoverageFrom: ["src/lib/**/*.{ts,tsx}"],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
    "./src/lib/calc/": {
      lines: 90,
      functions: 90,
    },
    "./src/lib/data/": {
      lines: 80,
      functions: 70,
    },
    "./src/lib/omni/": {
      lines: 90,
      functions: 90,
    },
    "./src/lib/parser/": {
      lines: 90,
      functions: 90,
    },
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default createJestConfig(config);
