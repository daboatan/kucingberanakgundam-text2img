# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Development (specific apps)
pnpm dev:web          # Frontend only (port 5173)
pnpm dev:api          # API only (port 8787)

# Local development (recommended: run in two terminals)
# Terminal 1: pnpm dev:api
# Terminal 2: pnpm dev:web
# Note: Set VITE_API_URL=http://localhost:8787 in apps/web/.env

# Build
pnpm build
pnpm build:web
pnpm build:api
pnpm build:shared     # Build shared package

# Lint & Format (Biome)
pnpm lint             # Lint all files
pnpm format           # Format all files
pnpm check            # Lint + format check

# Test (Vitest)
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with coverage

# Deploy API to Cloudflare Workers
cd apps/api && wrangler deploy --minify src/index.ts
```

## Architecture

This is a pnpm monorepo using Turborepo with three packages:

- `apps/web` - React 19 frontend (Vite, Tailwind CSS, shadcn/ui)
- `apps/api` - Hono API for Cloudflare Workers
- `packages/shared` - Shared types, constants, and utilities

### Shared Package (`packages/shared`)

Contains code shared between frontend and API:

- `src/types/` - TypeScript type definitions (provider, image, api)
- `src/constants/` - Provider configs, model configs, aspect ratios
- `src/utils/` - Validation utilities (prompt, dimensions, steps)

### API Provider System

The API uses a provider abstraction pattern:

- `apps/api/src/providers/types.ts` - Provider interface definition
- `apps/api/src/providers/gitee.ts` - Gitee AI implementation
- `apps/api/src/providers/huggingface.ts` - HuggingFace implementation
- `apps/api/src/providers/registry.ts` - Provider registration and lookup

### Key Endpoints

- `POST /api/generate` - Unified image generation endpoint
  - Supports `provider` parameter: `"gitee"` | `"huggingface"`
  - Requires `X-API-Key` header for Gitee AI
  - Optional `X-HF-Token` header for HuggingFace
- `POST /api/generate-hf` - Legacy HuggingFace endpoint (backward compatible)
- `POST /api/upscale` - RealESRGAN 4x upscaling

### Frontend Structure

- `src/pages/ImageGenerator.tsx` - Main page with single image generation
- `src/pages/FlowPage.tsx` - Visual canvas for batch generation using React Flow
- `src/hooks/useImageGenerator.ts` - Core state management and API calls
- `src/components/ui/` - shadcn/ui components
- `src/components/feature/` - Feature-specific components (PromptCard, ImageResultCard, etc.)
- `src/components/flow/` - React Flow nodes and layout utilities
- `src/lib/crypto.ts` - AES-256-GCM encryption for API key storage
- `src/lib/constants.ts` - Settings persistence and default values
- `src/lib/flow-storage.ts` - IndexedDB storage for Flow mode state

### Frontend Patterns

- Uses `@/` path alias for imports (maps to `src/`)
- Settings and API keys are persisted to localStorage (encrypted)
- Flow mode persists nodes/edges/images to IndexedDB
- API URL configured via `VITE_API_URL` env var (defaults to relative path for same-origin deployment)

### Tooling

- **Biome** - Linting and formatting (replaces ESLint + Prettier)
- **Vitest** - Testing framework for both frontend and API
- **Turborepo** - Monorepo build orchestration
