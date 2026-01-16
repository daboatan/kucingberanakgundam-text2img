/**
 * ModelScope Provider Implementation
 */

import { Errors } from '@z-image/shared'
import type { ImageProvider, ProviderGenerateRequest, ProviderGenerateResult } from './types'

interface ModelScopeTaskResponse {
  task_id?: string
}

interface ModelScopeTaskStatusResponse {
  task_status?: 'PENDING' | 'RUNNING' | 'SUCCEED' | 'FAILED'
  output_images?: string[]
  error_message?: string
}

interface ModelScopeErrorResponse {
  message?: string
  error?: string
  errors?: { message?: string }
  code?: string
}

/** Parse ModelScope API error response */
function parseModelScopeError(status: number, data: ModelScopeErrorResponse): Error {
  const provider = 'ModelScope'
  const message = data.errors?.message || data.error || data.message || `HTTP ${status}`

  // Check for authentication errors
  if (
    status === 401 ||
    status === 403 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid token')
  ) {
    return Errors.authInvalid(provider, message)
  }

  // Check for quota/rate limit errors
  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many')
  ) {
    return Errors.rateLimited(provider)
  }

  if (
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('exceeded') ||
    message.toLowerCase().includes('insufficient')
  ) {
    return Errors.quotaExceeded(provider)
  }

  // Check for token expiration
  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  // Generic provider error
  return Errors.providerError(provider, message)
}

export class ModelScopeProvider implements ImageProvider {
  readonly id = 'modelscope'
  readonly name = 'ModelScope'

  private readonly baseUrl = 'https://api-inference.modelscope.cn/v1'
  private readonly maxPollAttempts = 35
  private readonly pollIntervalMs = 3000

  async generate(request: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    if (!request.authToken) {
      throw Errors.authRequired('ModelScope')
    }

    const token = request.authToken.trim()

    if (token.length < 8) {
      throw Errors.authInvalid('ModelScope', 'Token is too short')
    }

    const sizeString = `${request.width}x${request.height}`
    const seed = request.seed ?? Math.floor(Math.random() * 2147483647)
    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model: request.model || 'Tongyi-MAI/Z-Image-Turbo',
      size: sizeString,
      seed,
      steps: request.steps ?? 9,
    }

    if (request.negativePrompt) {
      body.negative_prompt = request.negativePrompt
    }

    if (request.guidanceScale !== undefined) {
      body.guidance = request.guidanceScale
    }

    if (request.loras) {
      body.loras = request.loras
    }

    const taskId = await this.submitTask(token, body)
    const imageUrl = await this.pollForResult(token, taskId)

    return { url: imageUrl, seed }
  }

  private async submitTask(token: string, body: Record<string, unknown>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-ModelScope-Async-Mode': 'true',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as ModelScopeErrorResponse
      throw parseModelScopeError(response.status, errData)
    }

    const data = (await response.json()) as ModelScopeTaskResponse
    const taskId = data.task_id
    if (!taskId) {
      throw Errors.generationFailed('ModelScope', 'No task_id returned')
    }

    return taskId
  }

  private async pollForResult(token: string, taskId: string): Promise<string> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-ModelScope-Task-Type': 'image_generation',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout per request
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as ModelScopeErrorResponse
        throw parseModelScopeError(response.status, errData)
      }

      const data = (await response.json()) as ModelScopeTaskStatusResponse
      const status = data.task_status

      if (status === 'SUCCEED') {
        const imageUrl = data.output_images?.[0]
        if (!imageUrl) {
          throw Errors.generationFailed('ModelScope', 'No image in result')
        }
        return imageUrl
      }

      if (status === 'FAILED') {
        throw Errors.generationFailed('ModelScope', data.error_message || 'Task failed')
      }

      await this.delay(this.pollIntervalMs)
    }

    throw Errors.timeout('ModelScope')
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const modelscopeProvider = new ModelScopeProvider()
