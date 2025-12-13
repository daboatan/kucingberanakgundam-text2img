import type { ModelConfig } from '@z-image/shared'
import { Settings } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROVIDER_CONFIGS, PROVIDER_OPTIONS, type ProviderType } from '@/lib/constants'

interface ApiConfigAccordionProps {
  provider: ProviderType
  model: string
  currentToken: string
  availableModels: ModelConfig[]
  setProvider: (provider: ProviderType) => void
  setModel: (model: string) => void
  saveToken: (provider: ProviderType, token: string) => void
}

export function ApiConfigAccordion({
  provider,
  model,
  currentToken,
  availableModels,
  setProvider,
  setModel,
  saveToken,
}: ApiConfigAccordionProps) {
  const providerConfig = PROVIDER_CONFIGS[provider]
  const isConfigured = !providerConfig.requiresAuth || currentToken

  return (
    <Accordion
      type="single"
      collapsible
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
    >
      <AccordionItem value="api" className="border-none">
        <AccordionTrigger className="text-zinc-300 hover:no-underline">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>API Configuration</span>
            {isConfigured && <span className="text-xs text-green-500">● Ready</span>}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pb-2">
            {/* Provider Selection */}
            <div>
              <Label className="text-zinc-400 text-xs">Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as ProviderType)}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/70 backdrop-blur-md border-zinc-700 text-white">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {!opt.requiresAuth && (
                        <span className="ml-2 text-xs text-green-500">(Free)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div>
              <Label className="text-zinc-400 text-xs">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/70 backdrop-blur-md border-zinc-700 text-white">
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Token Input */}
            <div>
              <Label className="text-zinc-400 text-xs">
                {providerConfig.name} Token
                {!providerConfig.requiresAuth && ' (Optional)'}
              </Label>
              <Input
                type="password"
                placeholder={
                  providerConfig.requiresAuth
                    ? `Enter your ${providerConfig.name} API token...`
                    : 'Optional: for extra quota...'
                }
                value={currentToken}
                onChange={(e) => saveToken(provider, e.target.value)}
                onBlur={(e) => saveToken(provider, e.target.value)}
                className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
