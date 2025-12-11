# 重构计划

## 概述

本计划将 zenith-image-generator 项目重构为更模块化、可扩展的架构。

---

## 阶段一：基础设施准备

### 1.1 创建共享包 packages/shared

**目标**: 抽取前后端共用的类型、常量和工具函数

**文件结构**:
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── provider.ts      # Provider 相关类型
│   │   ├── image.ts         # 图片相关类型
│   │   ├── api.ts           # API 请求/响应类型
│   │   └── index.ts
│   ├── constants/
│   │   ├── providers.ts     # Provider 配置
│   │   ├── models.ts        # 模型配置
│   │   ├── ratios.ts        # 宽高比配置
│   │   └── index.ts
│   ├── utils/
│   │   ├── validation.ts    # 输入验证
│   │   └── index.ts
│   └── index.ts             # 统一导出
├── package.json
└── tsconfig.json
```

**步骤**:
1. 创建 `packages/shared` 目录结构
2. 配置 `package.json` (name: `@z-image/shared`)
3. 配置 `tsconfig.json` (输出 ESM + CJS)
4. 从 `apps/web/src/lib/constants.ts` 迁移类型和常量
5. 从 `apps/api/src/index.ts` 迁移验证逻辑
6. 在 `apps/web` 和 `apps/api` 的 `package.json` 添加依赖
7. 更新 `pnpm-workspace.yaml`

### 1.2 配置 Biome

**目标**: 替换 ESLint，统一 lint 和 format

**步骤**:
1. 在根目录安装 biome: `pnpm add -Dw @biomejs/biome`
2. 创建 `biome.json` 配置文件
3. 删除各 app 的 ESLint 相关依赖和配置
4. 更新 `package.json` scripts:
   - `lint`: `biome lint .`
   - `format`: `biome format . --write`
   - `check`: `biome check .`
5. 配置 VS Code 集成 (`.vscode/settings.json`)
6. 运行 `pnpm format` 格式化现有代码

### 1.3 配置 Vitest

**目标**: 建立前后端统一的测试框架

**步骤**:
1. 在根目录安装 vitest: `pnpm add -Dw vitest @vitest/coverage-v8`
2. 创建 `vitest.config.ts` (根目录)
3. 为 `packages/shared` 添加测试配置
4. 为 `apps/api` 添加测试配置 (miniflare 环境)
5. 为 `apps/web` 添加测试配置 (jsdom 环境)
6. 更新 `package.json` scripts:
   - `test`: `vitest`
   - `test:coverage`: `vitest run --coverage`
7. 编写基础测试用例验证配置

---

## 阶段二：API Provider 抽象

### 2.1 设计 Provider 接口

**目标**: 定义统一的 provider 抽象接口

**文件**: `apps/api/src/providers/types.ts`

```typescript
import type { GenerateRequest, GeneratedImage } from '@z-image/shared'

export interface ImageProvider {
  readonly id: string
  readonly name: string
  generate(request: ProviderGenerateRequest): Promise<GeneratedImage>
}

export interface ProviderGenerateRequest extends GenerateRequest {
  authToken?: string
}
```

### 2.2 实现各 Provider

**目标**: 将现有代码重构为 provider 实现

**文件结构**:
```
apps/api/src/providers/
├── types.ts           # Provider 接口定义
├── gitee.ts           # Gitee AI 实现
├── huggingface.ts     # HuggingFace 实现
├── registry.ts        # Provider 注册和获取
└── index.ts           # 统一导出
```

**步骤**:
1. 创建 `providers/types.ts` 定义接口
2. 从 `index.ts` 抽取 Gitee 逻辑到 `providers/gitee.ts`
3. 从 `index.ts` 抽取 HF 逻辑到 `providers/huggingface.ts`
4. 创建 `providers/registry.ts` 管理 provider 实例
5. 更新 `index.ts` 使用新的 provider 结构

### 2.3 统一 API 端点

**目标**: 合并 `/api/generate` 和 `/api/generate-hf` 为单一端点

**新端点设计**:
```
POST /api/generate
Body: {
  provider: "gitee" | "huggingface",
  model: string,
  prompt: string,
  ...
}
Headers:
  X-API-Key: string (Gitee)
  X-HF-Token: string (HuggingFace, 可选)
```

**兼容性**:
- 保留旧端点 `/api/generate-hf` 作为别名
- 添加弃用警告 header

---

## 阶段三：前端适配

### 3.1 更新 API 调用

**目标**: 前端使用统一的 API 调用方式

**文件**: `apps/web/src/lib/api.ts`

```typescript
import type { GenerateRequest, GenerateResponse } from '@z-image/shared'

export async function generateImage(
  request: GenerateRequest,
  authToken?: string
): Promise<GenerateResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // 根据 provider 设置对应的 auth header
  const providerConfig = PROVIDER_CONFIGS[request.provider]
  if (authToken) {
    headers[providerConfig.authHeader] = authToken
  }

  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  return response.json()
}
```

### 3.2 更新 useImageGenerator Hook

**目标**: 使用共享类型和新 API

**步骤**:
1. 导入 `@z-image/shared` 类型
2. 替换本地类型定义
3. 使用新的 `generateImage` 函数
4. 更新 provider 选择逻辑

### 3.3 更新常量配置

**目标**: 使用共享包的配置

**步骤**:
1. 从 `@z-image/shared` 导入配置
2. 删除 `lib/constants.ts` 中重复的定义
3. 保留前端特有的配置 (如 UI 相关)

---

## 阶段四：增强功能

### 4.1 添加 ModelScope Provider (可选)

**目标**: 扩展支持 ModelScope 平台

**步骤**:
1. 在 `@z-image/shared` 添加 ModelScope 配置
2. 实现 `apps/api/src/providers/modelscope.ts`
3. 注册到 provider registry
4. 前端添加 provider 选项

### 4.2 Token 轮换系统 (可选)

**目标**: 支持多 token 自动切换

**步骤**:
1. 在 `@z-image/shared/utils` 添加 token 管理工具
2. 前端实现 token 状态追踪
3. 按日重置耗尽状态

---

## 执行顺序

```
阶段一 (基础设施)
├── 1.1 创建 packages/shared ─────────────────┐
├── 1.2 配置 Biome ──────────────────────────┼── 可并行
└── 1.3 配置 Vitest ─────────────────────────┘
                    ↓
阶段二 (API 重构)
├── 2.1 设计 Provider 接口
├── 2.2 实现各 Provider
└── 2.3 统一 API 端点
                    ↓
阶段三 (前端适配)
├── 3.1 更新 API 调用
├── 3.2 更新 Hook
└── 3.3 更新常量
                    ↓
阶段四 (增强功能)
├── 4.1 添加 ModelScope
└── 4.2 Token 轮换
```

---

## 文件变更清单

### 新增文件

| 路径 | 用途 |
|------|------|
| `packages/shared/package.json` | 共享包配置 |
| `packages/shared/tsconfig.json` | TypeScript 配置 |
| `packages/shared/src/types/*.ts` | 类型定义 |
| `packages/shared/src/constants/*.ts` | 常量配置 |
| `packages/shared/src/utils/*.ts` | 工具函数 |
| `biome.json` | Biome 配置 |
| `vitest.config.ts` | Vitest 配置 |
| `apps/api/src/providers/*.ts` | Provider 实现 |
| `apps/web/src/lib/api.ts` | 统一 API 调用 |

### 修改文件

| 路径 | 变更 |
|------|------|
| `pnpm-workspace.yaml` | 添加 packages/* |
| `package.json` (root) | 添加 biome, vitest 依赖和脚本 |
| `apps/api/package.json` | 添加 @z-image/shared 依赖 |
| `apps/web/package.json` | 添加 @z-image/shared 依赖 |
| `apps/api/src/index.ts` | 使用 provider 抽象 |
| `apps/web/src/hooks/useImageGenerator.ts` | 使用共享类型 |
| `apps/web/src/lib/constants.ts` | 精简，导入共享配置 |
| `turbo.json` | 添加 test, format 任务 |

### 删除文件

| 路径 | 原因 |
|------|------|
| `apps/web/eslint.config.js` (如有) | 被 Biome 替代 |
| `apps/api/eslint.config.js` (如有) | 被 Biome 替代 |

---

## 验证检查点

### 阶段一完成后
- [ ] `pnpm install` 成功
- [ ] `pnpm lint` 使用 Biome 运行
- [ ] `pnpm test` 运行 Vitest
- [ ] `apps/web` 可导入 `@z-image/shared`
- [ ] `apps/api` 可导入 `@z-image/shared`

### 阶段二完成后
- [ ] `POST /api/generate` 支持 gitee provider
- [ ] `POST /api/generate` 支持 huggingface provider
- [ ] 旧端点 `/api/generate-hf` 仍可用
- [ ] Provider 单元测试通过

### 阶段三完成后
- [ ] `pnpm dev:web` 正常启动
- [ ] 前端可选择不同 provider
- [ ] 图片生成功能正常
- [ ] 上传缩放功能正常

### 最终验证
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 全部通过
- [ ] `pnpm lint` 无错误
- [ ] 本地开发环境正常
- [ ] Cloudflare Workers 部署正常
