/**
 * HuggingFace Provider Implementation
 */

import { HF_SPACES } from '@z-image/shared'
import type { GenerateSuccessResponse } from '@z-image/shared'
import type { ImageProvider, ProviderGenerateRequest } from './types'

/** Extract complete event data from SSE stream */
function extractCompleteEventData(sseStream: string): unknown {
  const lines = sseStream.split('\n')
  let isCompleteEvent = false

  for (const line of lines) {
    if (line.startsWith('event:')) {
      const eventType = line.substring(6).trim()
      if (eventType === 'complete') {
        isCompleteEvent = true
      } else if (eventType === 'error') {
        throw new Error('Quota exhausted, please set HF Token')
      } else {
        isCompleteEvent = false
      }
    } else if (line.startsWith('data:') && isCompleteEvent) {
      const jsonData = line.substring(5).trim()
      return JSON.parse(jsonData)
    }
  }
  throw new Error(`No complete event in response: ${sseStream.substring(0, 200)}`)
}

/** Call Gradio API */
async function callGradioApi(baseUrl: string, endpoint: string, data: unknown[], hfToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`

  const queue = await fetch(`${baseUrl}/gradio_api/call/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  })

  if (!queue.ok) throw new Error(`Queue request failed: ${queue.status}`)

  const queueData = (await queue.json()) as { event_id?: string }
  if (!queueData.event_id) throw new Error('No event_id returned')

  const result = await fetch(`${baseUrl}/gradio_api/call/${endpoint}/${queueData.event_id}`, {
    headers,
  })
  const text = await result.text()

  return extractCompleteEventData(text) as unknown[]
}

export class HuggingFaceProvider implements ImageProvider {
  readonly id = 'huggingface'
  readonly name = 'HuggingFace'

  async generate(request: ProviderGenerateRequest): Promise<GenerateSuccessResponse> {
    const seed = request.seed ?? Math.floor(Math.random() * 2147483647)
    const baseUrl = request.model === 'qwen' ? HF_SPACES.qwen : HF_SPACES.zImage

    const data = await callGradioApi(
      baseUrl,
      'generate_image',
      [request.prompt, request.height, request.width, 8, seed, false],
      request.authToken
    )

    const result = data as Array<{ url?: string } | number>
    const imageUrl = (result[0] as { url?: string })?.url
    if (!imageUrl) {
      throw new Error('No image returned from HuggingFace')
    }

    return {
      url: imageUrl,
      seed: result[1] as number,
    }
  }
}

export const huggingfaceProvider = new HuggingFaceProvider()
