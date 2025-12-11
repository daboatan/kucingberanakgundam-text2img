/**
 * Unified API Client
 *
 * Provides a unified interface for image generation across providers
 */

import type {
  GenerateErrorResponse,
  GenerateRequest,
  GenerateSuccessResponse,
  UpscaleRequest,
  UpscaleResponse,
} from '@z-image/shared'
import type { ApiProvider } from './constants'

const API_URL = import.meta.env.VITE_API_URL || ''

/** API response type */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

/** Generate image request options */
export interface GenerateOptions {
  provider: ApiProvider
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  steps?: number
  seed?: number
  model?: string
}

/** Auth tokens for API calls */
export interface AuthTokens {
  apiKey?: string
  hfToken?: string
}

/**
 * Generate image using the unified API
 */
export async function generateImage(
  options: GenerateOptions,
  tokens: AuthTokens
): Promise<ApiResponse<GenerateSuccessResponse>> {
  const { provider, prompt, negativePrompt, width, height, steps, seed, model } = options
  const { apiKey, hfToken } = tokens

  // Determine endpoint and headers based on provider
  const isGitee = provider === 'gitee'
  const isHuggingFace = provider === 'hf-zimage' || provider === 'hf-qwen'

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (isGitee && apiKey) {
    headers['X-API-Key'] = apiKey
  }
  if (isHuggingFace && hfToken) {
    headers['X-HF-Token'] = hfToken
  }

  // Use unified endpoint with provider parameter
  const endpoint = `${API_URL}/api/generate`

  // Map legacy provider names to new format
  const mappedProvider = isHuggingFace ? 'huggingface' : 'gitee'
  const mappedModel = provider === 'hf-qwen' ? 'qwen' : model || 'z-image-turbo'

  const body: GenerateRequest = {
    provider: mappedProvider,
    model: mappedModel,
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    seed,
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as GenerateErrorResponse
      return { success: false, error: errorData.error || 'Failed to generate image' }
    }

    return { success: true, data: data as GenerateSuccessResponse }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * Upscale image using RealESRGAN
 */
export async function upscaleImage(
  url: string,
  scale = 4,
  hfToken?: string
): Promise<ApiResponse<UpscaleResponse>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (hfToken) {
    headers['X-HF-Token'] = hfToken
  }

  const body: UpscaleRequest = { url, scale }

  try {
    const response = await fetch(`${API_URL}/api/upscale`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to upscale image' }
    }

    return { success: true, data: data as UpscaleResponse }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * Legacy generate function for HuggingFace (backward compatibility)
 */
export async function generateImageHF(
  options: Omit<GenerateOptions, 'provider' | 'negativePrompt'> & { model?: string },
  hfToken?: string
): Promise<ApiResponse<GenerateSuccessResponse>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (hfToken) {
    headers['X-HF-Token'] = hfToken
  }

  try {
    const response = await fetch(`${API_URL}/api/generate-hf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: options.prompt,
        width: options.width,
        height: options.height,
        model: options.model,
        seed: options.seed,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to generate image' }
    }

    return { success: true, data: data as GenerateSuccessResponse }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
