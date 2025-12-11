import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { User } from 'lucide-react'

export type UserPromptNodeData = {
  prompt: string
  timestamp: string
  width: number
  height: number
  batchCount: number
}

function UserPromptNode({ data }: NodeProps) {
  const { prompt, timestamp, width, height, batchCount } = data as UserPromptNodeData

  return (
    <div className="bg-zinc-800 rounded-2xl px-4 py-3 w-[280px] shadow-lg">
      <Handle type="target" position={Position.Top} className="bg-zinc-600!" />

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
          <User size={12} className="text-zinc-400" />
        </div>
        <span className="text-zinc-500 text-xs">{timestamp}</span>
        <span className="text-zinc-600 text-xs">|</span>
        <span className="text-zinc-500 text-xs">
          {width}x{height}
        </span>
        <span className="text-zinc-500 text-xs">x{batchCount}</span>
      </div>

      <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        <p className="text-zinc-200 text-sm leading-relaxed break-words">{prompt}</p>
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-orange-500!" />
    </div>
  )
}

export default memo(UserPromptNode)
