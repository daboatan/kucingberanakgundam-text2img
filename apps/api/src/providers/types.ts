/**
 * Provider Interface Definition
 */

import type { GenerateRequest, GenerateSuccessResponse } from '@z-image/shared'

/** Provider generate request with auth token */
export interface ProviderGenerateRequest extends Omit<GenerateRequest, 'provider'> {
  authToken?: string
}

/** Image provider interface */
export interface ImageProvider {
  /** Provider ID */
  readonly id: string
  /** Provider display name */
  readonly name: string
  /** Generate image */
  generate(request: ProviderGenerateRequest): Promise<GenerateSuccessResponse>
}
