# Skadi Monorepo

<p align="center">
  <a href="https://github.com/IgorSSK/skadi-project/actions/workflows/ci.yml"><img src="https://github.com/IgorSSK/skadi-project/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/org/skadi"><img src="https://img.shields.io/npm/v/@skadi/dynamo?label=@skadi/dynamo" alt="npm version" /></a>
  <a href="https://www.npmjs.com/org/skadi"><img src="https://img.shields.io/npm/dm/@skadi/dynamo" alt="downloads" /></a>
  <a href="https://github.com/IgorSSK/skadi-project/blob/main/LICENSE"><img src="https://img.shields.io/github/license/IgorSSK/skadi-project" alt="license" /></a>
  <a href="https://github.com/IgorSSK/skadi-project"><img src="https://img.shields.io/github/last-commit/IgorSSK/skadi-project" alt="last commit" /></a>
  <a href="https://github.com/IgorSSK/skadi-project/pulls"><img src="https://img.shields.io/github/issues-pr/IgorSSK/skadi-project" alt="open PRs" /></a>
  <a href="https://github.com/IgorSSK/skadi-project/issues"><img src="https://img.shields.io/github/issues/IgorSSK/skadi-project" alt="issues" /></a>
  <a href="https://codecov.io/gh/IgorSSK/skadi-project"><img src="https://img.shields.io/codecov/c/gh/IgorSSK/skadi-project?token=" alt="coverage" /></a>
  <a href="https://www.npmjs.com/org/skadi"><img src="https://img.shields.io/badge/published-npm%20%26%20github%20packages-blue" alt="registries" /></a>
  <a href="https://github.com/changesets/changesets"><img src="https://img.shields.io/badge/managed%20by-changesets-4B32C3" alt="changesets" /></a>
</p>

A TypeScript monorepo for Node.js libraries and utilities.

## 📦 Packages

### Libraries

- **[@skadi/dynamo](./packages/dynamo)** - DynamoDB utilities and helpers

## 🛠️ Development

This monorepo uses [pnpm](https://pnpm.io/) for package management and [Turborepo](https://turbo.build/) for build orchestration.

### Prerequisites

- Node.js >= 22.17.1 (LTS)
- pnpm >= 10.13.1

> **Note**: This project uses `.nvmrc` to specify the Node.js version. If you use nvm, run `nvm use` to automatically switch to the correct version.

### Installation

```bash
pnpm install
```

### Available Scripts

```bash
# Build all packages
pnpm build

# Run tests for all packages
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint all packages
pnpm lint

# Format all code
pnpm format

# Check formatting
pnpm format:check

# Type check all packages
pnpm type-check

# Clean all build artifacts
pnpm clean
```

### Development Workflow

1. **Create a new package:**
   ```bash
   mkdir packages/my-package
   cd packages/my-package
   # Copy package.json template and modify as needed
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Development mode:**
   ```bash
   pnpm dev
   ```

4. **Build:**
   ```bash
   pnpm build
   ```

### Package Structure

Each package follows this structure:

```
packages/package-name/
├── src/
│   ├── index.ts
│   └── ...
├── tests/
│   └── *.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

### Adding Dependencies

- **Workspace dependencies:** Reference other packages using `workspace:*`
- **External dependencies:** Add to individual package's `package.json`
- **Shared dev dependencies:** Add to root `package.json`

Example:
```bash
# Add dependency to specific package
pnpm add --filter @skadi/dynamo @aws-sdk/client-dynamodb

# Add dev dependency to root
pnpm add -D -w typescript

# Add dependency to all packages
pnpm add -r lodash
```

## 🚀 Publishing

Este monorepo publica pacotes em dois registries:

1. npm (registry.npmjs.org)
2. GitHub Packages (npm.pkg.github.com)

Automações:
- Versionamento e geração de changelog com Changesets
- Workflow CI valida lint, tipos, testes, cobertura mínima (80%) e build
- Publicação sequencial: npm primeiro, depois GitHub Packages

### Autenticação Local

Crie/edite um `~/.npmrc` com:
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@skadi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Passos Manuais (se necessário)

```bash
pnpm changeset           # cria changeset
pnpm version-packages    # aplica versões
pnpm release:npm         # publica no npm
pnpm release:github      # publica no GitHub Packages
```

## 📋 Guidelines

### Package Naming

- Use scoped packages: `@skadi/package-name`
- Use kebab-case for package names
- Be descriptive but concise

### Code Style

- TypeScript with strict mode enabled
- Biome for linting and formatting
- Follow conventional commits

### Testing

- Write tests for all public APIs
- Aim for high test coverage
- Use descriptive test names

### Documentation

- Each package should have a comprehensive README
- Include usage examples
- Document all public APIs

## 🏗️ Architecture

### Turborepo Configuration

The monorepo uses Turborepo for:
- Parallel task execution
- Intelligent caching
- Dependency graph management

### Build System

- **TypeScript**: Source code compilation
- **tsup**: Fast TypeScript bundler
- **Vitest**: Testing framework
- **Biome**: Linting and formatting

### Package Management

- **pnpm workspaces**: Efficient package management
- **Catalog**: Shared dependency versions
- **Renovate**: Automated dependency updates (configured in `renovate.json`)

### Dependency Management

Dependencies are automatically updated using Renovate:
- **Dev dependencies**: Auto-merged weekly
- **Production dependencies**: Require manual review
- **Security updates**: Auto-merged immediately
- **Major updates**: Scheduled monthly

## 📄 License

MIT
