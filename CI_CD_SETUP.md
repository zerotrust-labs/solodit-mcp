# CI/CD Pipeline Setup

This document describes the complete CI/CD pipeline and code quality tooling configured for the Solodit MCP project.

## Overview

The project now includes a comprehensive CI/CD pipeline with:

- ✅ ESLint for code linting
- ✅ Prettier for code formatting
- ✅ Husky for git hooks
- ✅ lint-staged for pre-commit checks
- ✅ GitHub Actions for automated CI/CD
- ✅ TypeScript type checking
- ✅ MIT License

## Tools and Configuration

### 1. ESLint

**File:** `eslint.config.js`

Modern ESLint flat config with:

- TypeScript support via `typescript-eslint`
- Prettier integration
- Recommended rules from `@eslint/js`
- Custom rules for unused variables

**Usage:**

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting errors
```

### 2. Prettier

**Files:** `.prettierrc`, `.prettierignore`

Code formatting configuration:

- 2 spaces indentation
- Semicolons enabled
- Double quotes
- 80 character line width
- LF line endings

**Usage:**

```bash
npm run format        # Format all source files
npm run format:check  # Check formatting without changing files
```

### 3. Husky

**Directory:** `.husky/`

Git hooks configuration:

- Pre-commit hook runs `lint-staged`
- Automatically initialized with `npm prepare`

**Setup:**

```bash
npm run prepare  # Initialize Husky (runs automatically on npm install)
```

### 4. lint-staged

**Configuration:** In `package.json`

Runs checks on staged files before commit:

- TypeScript files: ESLint + Prettier
- JSON/Markdown files: Prettier only

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### 5. GitHub Actions

**File:** `.github/workflows/ci.yml`

Automated CI pipeline with two jobs:

#### Quality Job

- Runs on Node.js 18.x and 20.x
- Type checking with TypeScript
- Linting with ESLint
- Format checking with Prettier
- Build verification

#### Security Job

- Runs npm audit for security vulnerabilities
- Checks for moderate and higher severity issues

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### 6. TypeScript Type Checking

**Usage:**

```bash
npm run type-check  # Run TypeScript compiler without emitting files
```

## NPM Scripts

All available scripts in `package.json`:

```json
{
  "scripts": {
    "build": "tsc", // Compile TypeScript
    "dev": "tsx src/index.ts", // Run in development mode
    "start": "node dist/index.js", // Run compiled version
    "watch": "tsc --watch", // Watch mode compilation
    "lint": "eslint src/**/*.ts", // Lint source files
    "lint:fix": "eslint src/**/*.ts --fix", // Auto-fix linting
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json}\"", // Format files
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json}\"", // Check formatting
    "type-check": "tsc --noEmit", // Type check without building
    "prepare": "husky" // Initialize Husky
  }
}
```

## Developer Workflow

### Initial Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Husky will be automatically initialized

**Important:** The `package-lock.json` file is tracked in git to ensure consistent dependency versions across all environments and in CI/CD.

### Daily Development

1. Make your changes to the code
2. Stage your changes:
   ```bash
   git add .
   ```
3. Commit (pre-commit hook will automatically run):
   ```bash
   git commit -m "your message"
   ```
4. The pre-commit hook will:
   - Run ESLint and auto-fix issues
   - Run Prettier and format code
   - Block the commit if there are unfixable errors

### Manual Checks

Run these commands manually anytime:

```bash
# Check everything locally before pushing
npm run type-check
npm run lint
npm run format:check
npm run build
```

## CI/CD Pipeline Flow

### On Push/Pull Request

1. **Quality Check Job**
   - Checkout code
   - Setup Node.js (matrix: 18.x, 20.x)
   - Install dependencies
   - Run type checking
   - Run linting
   - Check code formatting
   - Build the project

2. **Security Audit Job**
   - Checkout code
   - Setup Node.js 20.x
   - Install dependencies
   - Run npm audit

### Success Criteria

All checks must pass:

- ✅ TypeScript compiles without errors
- ✅ No linting errors
- ✅ Code is properly formatted
- ✅ Project builds successfully
- ✅ No moderate+ security vulnerabilities

## Pre-commit Hook Details

The pre-commit hook (`.husky/pre-commit`) runs `lint-staged`, which:

1. Identifies all staged `.ts` files
2. Runs `eslint --fix` on them
3. Runs `prettier --write` on them
4. Stages the fixed files
5. Identifies all staged `.json` and `.md` files
6. Runs `prettier --write` on them
7. Stages the formatted files

If any step fails with unfixable errors, the commit is blocked.

## Configuration Files Summary

- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to exclude from Prettier
- `.husky/pre-commit` - Pre-commit hook script
- `.github/workflows/ci.yml` - GitHub Actions workflow
- `package.json` - lint-staged configuration and npm scripts

## Benefits

1. **Consistent Code Quality**: All code follows the same standards
2. **Automated Checks**: No manual verification needed
3. **Early Error Detection**: Issues caught before push
4. **Team Collaboration**: Everyone uses the same tools
5. **CI/CD Integration**: Automated testing on GitHub
6. **Multi-Node Support**: Tested on Node.js 18 and 20

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinitialize Husky
npm run prepare
# Make sure the hook is executable
chmod +x .husky/pre-commit
```

### ESLint errors

```bash
# Try auto-fixing
npm run lint:fix
# If issues persist, fix manually and check again
npm run lint
```

### Prettier formatting issues

```bash
# Auto-format all files
npm run format
# Then check again
npm run format:check
```

### GitHub Actions failing

1. Check the Actions tab in your GitHub repository
2. Review the failed step logs
3. Run the same commands locally to reproduce
4. Fix the issues and push again

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
