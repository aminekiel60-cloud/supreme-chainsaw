// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'modules/*/android/*'],
  },
  {
    rules: {
      // Animated values kept in useRef and random particle positions are the normal
      // React Native animation pattern. The React Compiler just skips those components.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // expo-notifications re-exports its enums in a way this rule can't follow.
      'import/namespace': 'off',
    },
  },
]);
