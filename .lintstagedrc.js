export default {
  "**/*.{js,jsx,mjs,cjs,ts,mts,css,scss}": ["prettier --write"],
  "**/*.php": ["pnpm run format:php"],
};
