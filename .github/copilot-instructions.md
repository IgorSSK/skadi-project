<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Skadi Monorepo Development Guidelines

## Project Structure
This is a TypeScript monorepo for Node.js libraries using:
- **pnpm workspaces** for package management
- **Turborepo** for build orchestration
- **TypeScript** with strict configuration
- **Vitest** for testing
- **tsup** for bundling
- **ESLint + Prettier** for code quality

## Package Guidelines
- Use scoped packages with `@skadi/` prefix
- Follow the established folder structure in `packages/`
- Each package should have: `src/`, `tests/`, proper `package.json`, `tsconfig.json`, `tsup.config.ts`
- Use `catalog:` for shared dependencies in `devDependencies`
- Export all public APIs through `index.ts` with `.js` extensions for imports

## Code Style
- Use TypeScript with strict mode enabled
- Follow Biome rules for linting and formatting
- Write comprehensive tests for all public APIs
- Include proper JSDoc comments for exported functions/classes

## File Extensions
- Use `.ts` for source files
- Import with `.js` extensions due to `verbatimModuleSyntax` setting
- Use `type` imports when importing only types

## Testing
- Use Vitest for all testing
- Test files should be in `tests/` directory with `.test.ts` extension
- Write descriptive test names and group related tests with `describe`

## Documentation
- Each package needs a comprehensive README.md
- Include installation, usage examples, and API documentation
- Update root README.md when adding new packages
