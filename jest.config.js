module.exports = {
  preset: 'jest-expo',
  // Lõi game (engine, constants) là TS thuần, không cần môi trường trình duyệt.
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
