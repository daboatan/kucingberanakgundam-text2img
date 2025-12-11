# Refactoring Progress

## Status: Complete ✅

### Completed Tasks

#### 1. Created packages/shared (✅)
- `packages/shared/src/types/` - Type definitions (provider, image, api)
- `packages/shared/src/constants/` - Provider, model, and aspect ratio configs
- `packages/shared/src/utils/` - Validation utilities
- Configured TypeScript compilation with ESM output
- Added to workspace dependencies

#### 2. Configured Biome (✅)
- Replaced ESLint with Biome
- Root-level `biome.json` configuration
- Support for JSON comments in tsconfig files
- Scripts: `lint`, `format`, `check`

#### 3. Configured Vitest (✅)
- Root-level `vitest.config.ts`
- Test file: `packages/shared/src/utils/validation.test.ts` (17 tests passing)
- Scripts: `test`, `test:run`, `test:coverage`

#### 4. Refactored API Provider Abstraction (✅)
- `apps/api/src/providers/types.ts` - Provider interface
- `apps/api/src/providers/gitee.ts` - Gitee AI implementation
- `apps/api/src/providers/huggingface.ts` - HuggingFace implementation
- `apps/api/src/providers/registry.ts` - Provider registry

#### 5. Unified API Endpoints (✅)
- `POST /api/generate` now accepts `provider` parameter
- Backward compatible with existing requests (defaults to gitee)
- Legacy `/api/generate-hf` endpoint preserved

#### 6. Frontend Adaptation (✅)
- Updated `apps/web/src/lib/constants.ts` to use shared types
- Created unified API client `apps/web/src/lib/api.ts`
- Updated `apps/web/src/hooks/useImageGenerator.ts` to use new API client

---

## New Architecture

```
zenith-image-generator/
├── packages/
│   └── shared/                    # NEW: Shared package
│       └── src/
│           ├── types/             # Type definitions
│           ├── constants/         # Provider/model configs
│           └── utils/             # Validation utilities
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── providers/         # NEW: Provider implementations
│   │       │   ├── types.ts
│   │       │   ├── gitee.ts
│   │       │   ├── huggingface.ts
│   │       │   └── registry.ts
│   │       └── index.ts           # Updated to use providers
│   └── web/
│       └── src/
│           └── ...                # Pending frontend updates
├── biome.json                     # NEW: Biome config
├── vitest.config.ts               # NEW: Vitest config
└── ...
```

---

## New Commands

```bash
# Lint with Biome
pnpm lint

# Format with Biome
pnpm format

# Run tests
pnpm test
pnpm test:run
pnpm test:coverage

# Build shared package
pnpm build:shared
```

---

## API Changes

### New Unified Generate Endpoint

```typescript
POST /api/generate
{
  "provider": "gitee" | "huggingface",  // NEW (optional, default: gitee)
  "model": "z-image-turbo",
  "prompt": "...",
  "negativePrompt": "...",              // NEW (replaces negative_prompt)
  "width": 1024,
  "height": 1024,
  "steps": 9,                           // NEW (replaces num_inference_steps)
  "seed": 12345
}
```

### Backward Compatibility

- `negative_prompt` still accepted (mapped to `negativePrompt`)
- `num_inference_steps` still accepted (mapped to `steps`)
- Missing `provider` defaults to `"gitee"`
- Legacy `/api/generate-hf` endpoint still works
