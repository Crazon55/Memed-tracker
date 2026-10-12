// Jest runs the TypeScript tests directly through ts-jest.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
};
