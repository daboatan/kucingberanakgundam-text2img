/**
 * Provider Registry
 */

import type { ProviderType } from '@z-image/shared'
import { giteeProvider } from './gitee'
import { huggingfaceProvider } from './huggingface'
import type { ImageProvider } from './types'

/** Provider registry map */
const providers: Record<string, ImageProvider> = {
  gitee: giteeProvider,
  huggingface: huggingfaceProvider,
}

/** Get provider by ID */
export function getProvider(providerId: ProviderType): ImageProvider {
  const provider = providers[providerId]
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`)
  }
  return provider
}

/** Check if provider exists */
export function hasProvider(providerId: string): boolean {
  return providerId in providers
}

/** Get all provider IDs */
export function getProviderIds(): string[] {
  return Object.keys(providers)
}

/** Register a new provider */
export function registerProvider(provider: ImageProvider): void {
  providers[provider.id] = provider
}
