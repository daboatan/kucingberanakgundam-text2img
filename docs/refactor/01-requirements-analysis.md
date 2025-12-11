# 需求分析

## 1. 当前项目状态

### 1.1 架构现状

```
zenith-image-generator/
├── apps/
│   ├── api/          # Hono API (Cloudflare Workers)
│   └── web/          # React 19 前端 (Vite)
├── packages/         # 空目录，未使用
├── turbo.json
└── pnpm-workspace.yaml
```

### 1.2 现存问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **类型定义重复** | `GeneratedImage`、`ApiProvider` 等类型分散在前后端 | 维护成本高，易不一致 |
| **Provider 耦合** | API 端点按 provider 分开 (`/generate`, `/generate-hf`) | 扩展新 provider 需改动多处 |
| **工具函数未共享** | 加密、验证等工具仅在 web 端 | 代码复用差 |
| **无测试框架** | 没有任何测试配置 | 质量保障缺失 |
| **Lint/Format 不统一** | ESLint 配置不完整，无 Prettier | 代码风格不一致 |
| **配置分散** | 模型配置、API 端点等硬编码在各处 | 难以维护和扩展 |

### 1.3 现有 Provider 实现

| Provider | 端点 | 认证方式 | 特性 |
|----------|------|---------|------|
| Gitee AI | `/api/generate` | X-API-Key | 支持 negative prompt, steps |
| HF Z-Image | `/api/generate-hf` | X-HF-Token (可选) | Gradio API |
| HF Qwen | `/api/generate-hf` | X-HF-Token (可选) | Gradio API |

---

## 2. 重构目标

### 2.1 核心目标

1. **共享代码包** - 创建 `packages/shared` 抽取公共类型和工具
2. **Provider 抽象** - 统一 provider 接口，支持插件式扩展
3. **工具链统一** - Biome (lint/format) + Vitest (测试)
4. **配置中心化** - 模型、参数、端点配置集中管理

### 2.2 目标架构

```
zenith-image-generator/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── providers/        # Provider 实现
│   │       │   ├── gitee.ts
│   │       │   ├── huggingface.ts
│   │       │   └── index.ts      # Provider 注册
│   │       ├── routes/           # 路由处理
│   │       └── index.ts
│   └── web/
│       └── src/
│           ├── lib/
│           │   └── api.ts        # 统一 API 调用
│           └── ...
├── packages/
│   └── shared/
│       └── src/
│           ├── types/            # 共享类型定义
│           │   ├── provider.ts
│           │   ├── image.ts
│           │   └── index.ts
│           ├── constants/        # 共享常量配置
│           │   ├── models.ts
│           │   ├── ratios.ts
│           │   └── index.ts
│           ├── utils/            # 共享工具函数
│           │   ├── validation.ts
│           │   └── index.ts
│           └── index.ts
├── biome.json                    # Biome 配置
├── vitest.config.ts              # Vitest 配置
└── ...
```

---

## 3. 详细需求

### 3.1 共享包 (packages/shared)

#### 3.1.1 类型定义 (types/)

```typescript
// provider.ts
export type ProviderType = 'gitee' | 'huggingface' | 'modelscope';

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  models: ModelConfig[];
  requiresAuth: boolean;
  authHeader: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  supportedFeatures: {
    negativePrompt: boolean;
    steps: { min: number; max: number; default: number };
    guidanceScale?: { min: number; max: number; default: number };
    seed: boolean;
  };
}

// image.ts
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  width: number;
  height: number;
  timestamp: number;
  model: string;
  provider: ProviderType;
  seed?: number;
  steps?: number;
  duration?: number;
  isBlurred?: boolean;
  isUpscaled?: boolean;
}

export interface GenerateRequest {
  provider: ProviderType;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps?: number;
  seed?: number;
  guidanceScale?: number;
}

export interface GenerateResponse {
  success: boolean;
  image?: GeneratedImage;
  error?: string;
}
```

#### 3.1.2 常量配置 (constants/)

```typescript
// models.ts
export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  gitee: {
    id: 'gitee',
    name: 'Gitee AI',
    models: [
      {
        id: 'z-image-turbo',
        name: 'Z-Image Turbo',
        provider: 'gitee',
        supportedFeatures: {
          negativePrompt: true,
          steps: { min: 1, max: 50, default: 20 },
          seed: true,
        },
      },
    ],
    requiresAuth: true,
    authHeader: 'X-API-Key',
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace',
    models: [
      {
        id: 'z-image-turbo',
        name: 'Z-Image Turbo',
        provider: 'huggingface',
        supportedFeatures: {
          negativePrompt: false,
          steps: { min: 1, max: 20, default: 9 },
          seed: true,
        },
      },
      {
        id: 'qwen-image',
        name: 'Qwen Image',
        provider: 'huggingface',
        supportedFeatures: {
          negativePrompt: false,
          steps: { min: 1, max: 20, default: 9 },
          seed: true,
        },
      },
    ],
    requiresAuth: false,
    authHeader: 'X-HF-Token',
  },
  modelscope: {
    id: 'modelscope',
    name: 'ModelScope',
    models: [],
    requiresAuth: true,
    authHeader: 'X-MS-Token',
  },
};

// ratios.ts
export const ASPECT_RATIOS = {
  '1:1': { label: '1:1', presets: [{ w: 1024, h: 1024 }] },
  '4:3': { label: '4:3', presets: [{ w: 1024, h: 768 }] },
  '3:4': { label: '3:4', presets: [{ w: 768, h: 1024 }] },
  '16:9': { label: '16:9', presets: [{ w: 1024, h: 576 }] },
  '9:16': { label: '9:16', presets: [{ w: 576, h: 1024 }] },
} as const;
```

#### 3.1.3 工具函数 (utils/)

```typescript
// validation.ts
export const validatePrompt = (prompt: string): { valid: boolean; error?: string } => {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is required' };
  }
  if (prompt.length > 10000) {
    return { valid: false, error: 'Prompt exceeds 10000 characters' };
  }
  return { valid: true };
};

export const validateDimensions = (
  width: number,
  height: number
): { valid: boolean; error?: string } => {
  if (width < 256 || width > 2048 || height < 256 || height > 2048) {
    return { valid: false, error: 'Dimensions must be between 256 and 2048' };
  }
  return { valid: true };
};
```

### 3.2 API Provider 抽象

#### 3.2.1 Provider 接口

```typescript
// apps/api/src/providers/types.ts
import type { GenerateRequest, GeneratedImage } from '@z-image/shared';

export interface ImageProvider {
  readonly id: string;
  generate(request: GenerateRequest, authToken?: string): Promise<GeneratedImage>;
  validateAuth?(token: string): Promise<boolean>;
}
```

#### 3.2.2 统一 API 端点

```typescript
// apps/api/src/routes/generate.ts
app.post('/api/generate', async (c) => {
  const body = await c.req.json<GenerateRequest>();
  const provider = getProvider(body.provider);
  const authToken = c.req.header(provider.config.authHeader);

  const result = await provider.generate(body, authToken);
  return c.json({ success: true, image: result });
});
```

### 3.3 工具链配置

#### 3.3.1 Biome

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

#### 3.3.2 Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### 3.4 Token 轮换系统 (可选增强)

参考 peinture 的设计，支持多 Token 自动切换：

```typescript
// packages/shared/src/utils/token-rotation.ts
export interface TokenManager {
  getNextToken(): string | null;
  markExhausted(token: string): void;
  resetDaily(): void;
}
```

---

## 4. 非功能性需求

### 4.1 兼容性

- 保持现有 API 端点向后兼容
- 现有前端调用方式不变
- 渐进式迁移，不影响生产

### 4.2 性能

- 共享包使用 tree-shaking 友好的导出
- 类型定义纯净，无运行时开销
- Provider 实现懒加载

### 4.3 开发体验

- 单一命令运行所有测试
- 统一的代码风格检查
- 清晰的模块边界
- 完善的类型提示

---

## 5. 优先级排序

| 优先级 | 任务 | 原因 |
|--------|------|------|
| P0 | 创建 packages/shared | 基础设施，其他依赖 |
| P0 | 配置 Biome | 统一代码风格 |
| P1 | Provider 抽象重构 | 核心架构改进 |
| P1 | 配置 Vitest | 质量保障 |
| P2 | 统一 API 端点 | API 简化 |
| P2 | Token 轮换系统 | 增强功能 |
| P3 | 前端适配 | 跟随后端变化 |

---

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 破坏现有功能 | 高 | 保持 API 兼容，渐进式迁移 |
| 共享包循环依赖 | 中 | 严格控制导入方向 |
| Biome 与现有配置冲突 | 低 | 移除 ESLint，全面切换 |
| 测试覆盖不足 | 中 | 先覆盖核心路径 |
