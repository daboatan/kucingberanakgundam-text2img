/**
 * Model Configuration
 */

import type { ModelConfig, ProviderType } from '../types/provider'

/** All model configurations */
export const MODEL_CONFIGS: ModelConfig[] = [
  // Gitee AI models
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'gitee',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 9 },
      seed: true,
    },
  },
  // HuggingFace models
  {
    id: 'z-image',
    name: 'Z-Image Turbo',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 20, default: 8 },
      seed: true,
    },
  },
  {
    id: 'qwen',
    name: 'Qwen Image',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 20, default: 8 },
      seed: true,
    },
  },
]

/** Get models by provider */
export function getModelsByProvider(provider: ProviderType): ModelConfig[] {
  return MODEL_CONFIGS.filter((m) => m.provider === provider)
}

/** Get model configuration by ID */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.id === modelId)
}

/** Get model configuration by provider and ID */
export function getModelByProviderAndId(
  provider: ProviderType,
  modelId: string
): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.provider === provider && m.id === modelId)
}
