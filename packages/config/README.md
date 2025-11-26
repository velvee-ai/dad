# @daad/config

Shared configuration files for DAAD monorepo.

## Installation

```bash
pnpm add -D @daad/config@workspace:*
```

## Usage

### TypeScript

Create `tsconfig.json`:

```json
{
  "extends": "@daad/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

For React projects:

```json
{
  "extends": "@daad/config/typescript/react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### ESLint

Create `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@daad/config/eslint'],
  // Add project-specific rules
};
```

## Available Configs

- `@daad/config/typescript/base.json` - Base TypeScript config
- `@daad/config/typescript/react.json` - React TypeScript config
- `@daad/config/eslint` - ESLint config
