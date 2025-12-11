/**
 * Provider Configuration
 */

import type { ProviderConfig } from '../types/provider'

/** HuggingFace Spaces URLs */
export const HF_SPACES = {
  zImage: 'https://luca115-z-image-turbo.hf.space',
  qwen: 'https://mcp-tools-qwen-image-fast.hf.space',
  upscaler: 'https://tuan2308-upscaler.hf.space',
} as const

/** Provider configuration map */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  gitee: {
    id: 'gitee',
    name: 'Gitee AI',
    requiresAuth: true,
    authHeader: 'X-API-Key',
    baseUrl: 'https://ai.gitee.com/v1',
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace',
    requiresAuth: false,
    authHeader: 'X-HF-Token',
    baseUrl: HF_SPACES.zImage,
  },
} as const

/** Get provider configuration by ID */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerId]
}
