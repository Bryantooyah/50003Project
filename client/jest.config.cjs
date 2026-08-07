module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: {
          ignoreCodes: [1343, 2339],
        },
         tsconfig: {
           jsx: 'react-jsx',
           esModuleInterop: true,
           verbatimModuleSyntax: false,
           module: 'commonjs',
           moduleResolution: 'node',
           target: 'es2023',
           lib: ['es2023', 'dom'],
           types: ['jest', 'node'],
         },
      },
    ],
  },
};
