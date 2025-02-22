module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "^/opt/nodejs/(.*)$": "<rootDir>/layers/nodejs/$1",
  },
};
