/**
 * Frontend Constants
 *
 * Uses shared types and constants from @z-image/shared
 * with frontend-specific additions (icons)
 */

import {
  type AspectRatioConfig,
  PROVIDER_CONFIGS,
  type ProviderType,
  ASPECT_RATIOS as SHARED_ASPECT_RATIOS,
} from '@z-image/shared'
import { RectangleHorizontal, RectangleVertical, Square } from 'lucide-react'

// Re-export shared types
export type { ProviderType, AspectRatioConfig }
export { PROVIDER_CONFIGS }

// Environment defaults
export const DEFAULT_PROMPT = import.meta.env.VITE_DEFAULT_PROMPT
export const DEFAULT_NEGATIVE_PROMPT = import.meta.env.VITE_DEFAULT_NEGATIVE_PROMPT

// Aspect ratios with icons for UI
const ASPECT_RATIO_ICONS = {
  '1:1': Square,
  '4:3': RectangleHorizontal,
  '3:4': RectangleVertical,
  '16:9': RectangleHorizontal,
  '9:16': RectangleVertical,
} as const

export interface AspectRatioWithIcon extends AspectRatioConfig {
  icon: typeof Square
}

export const ASPECT_RATIOS: AspectRatioWithIcon[] = SHARED_ASPECT_RATIOS.map((ratio) => ({
  ...ratio,
  icon: ASPECT_RATIO_ICONS[ratio.label as keyof typeof ASPECT_RATIO_ICONS] || Square,
}))

export type AspectRatio = (typeof ASPECT_RATIOS)[number]

// Legacy type alias for backward compatibility
export type ApiProvider = ProviderType | 'hf-zimage' | 'hf-qwen'

// Storage
export const STORAGE_KEY = 'zenith-settings'

export function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// Provider options for UI
export const PROVIDER_OPTIONS = [
  { value: 'gitee', label: 'Gitee AI', requiresAuth: true },
  { value: 'hf-zimage', label: 'HF Z-Image', requiresAuth: false },
  { value: 'hf-qwen', label: 'HF Qwen', requiresAuth: false },
] as const
