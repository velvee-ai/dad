# @dad/config

Shared configuration files for DAD monorepo.

## Installation

```bash
pnpm add -D @dad/config@workspace:*
```

## Usage

### TypeScript

Create `tsconfig.json`:

```json
{
  "extends": "@dad/config/typescript/base.json",
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
  "extends": "@dad/config/typescript/react.json",
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
  extends: ['@dad/config/eslint'],
  // Add project-specific rules
};
```

## Available Configs

- `@dad/config/typescript/base.json` - Base TypeScript config
- `@dad/config/typescript/react.json` - React TypeScript config
- `@dad/config/eslint` - ESLint config
