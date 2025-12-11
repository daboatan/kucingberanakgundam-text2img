/**
 * Gitee AI Provider Implementation
 */

import type { GenerateSuccessResponse } from '@z-image/shared'
import OpenAI from 'openai'
import type { ImageProvider, ProviderGenerateRequest } from './types'

export class GiteeProvider implements ImageProvider {
  readonly id = 'gitee'
  readonly name = 'Gitee AI'

  private readonly baseUrl = 'https://ai.gitee.com/v1'

  async generate(request: ProviderGenerateRequest): Promise<GenerateSuccessResponse> {
    if (!request.authToken) {
      throw new Error('API Key is required for Gitee AI')
    }

    const client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: request.authToken.trim(),
    })

    const response = await client.images.generate({
      prompt: request.prompt,
      model: request.model || 'z-image-turbo',
      size: `${request.width}x${request.height}` as '1024x1024',
      // @ts-expect-error extra_body is supported by OpenAI SDK
      extra_body: {
        negative_prompt: request.negativePrompt || '',
        num_inference_steps: request.steps ?? 9,
      },
    })

    const imageData = response.data?.[0]
    if (!imageData || (!imageData.url && !imageData.b64_json)) {
      throw new Error('No image returned from Gitee AI')
    }

    return {
      url: imageData.url,
      b64_json: imageData.b64_json,
    }
  }
}

export const giteeProvider = new GiteeProvider()
