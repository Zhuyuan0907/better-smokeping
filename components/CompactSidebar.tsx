'use client'

import { useState, useEffect, useMemo } from 'react'
import { Moon, Sun, Network, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface Target {
  id: number
  name: string
  host: string
  description?: string
  group: string
  enabled: boolean
}

interface CompactSidebarProps {
  targets: Target[]
  selectedTarget: Target | null
  selectedGroup: string | null
  onSelectTarget: (target: Target) => void
  onSelectGroup: (group: string) => void
}

export default function CompactSidebar({
  targets,
  selectedTarget,
  selectedGroup,
  onSelectTarget,
  onSelectGroup,
}: CompactSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  const groupedTargets = useMemo(() => {
    return targets.reduce((acc, target) => {
      const group = target.group || '未分類'
      if (!acc[group]) acc[group] = []
      acc[group].push(target)
      return acc
    }, {} as Record<string, Target[]>)
  }, [targets])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  const totalEnabled = targets.filter(t => t.enabled).length

  return (
    <div className="w-48 flex flex-col bg-[#1e1e2e] text-[#cdd6f4] text-[12px]">
      {/* Logo */}
      <div className="h-10 px-3 flex items-center gap-2 border-b border-[#313244]">
        <Network className="h-4 w-4 text-[#89b4fa]" />
        <span className="font-semibold flex-1">Smokeping</span>
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1 rounded hover:bg-[#313244] text-[#6c7086]"
          >
            {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {Object.entries(groupedTargets).map(([group, groupTargets]) => {
          const isExpanded = expandedGroups.has(group)
          const isGroupSelected = selectedGroup === group && !selectedTarget
          const enabledCount = groupTargets.filter(t => t.enabled).length

          return (
            <div key={group}>
              {/* 分組 */}
              <button
                onClick={() => toggleGroup(group)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1 rounded text-left",
                  isGroupSelected
                    ? "bg-[#89b4fa] text-[#1e1e2e] font-medium"
                    : "hover:bg-[#313244] text-[#a6adc8]"
                )}
              >
                <span className={cn(
                  "text-[9px] transition-transform",
                  isExpanded ? "rotate-90" : ""
                )}>▶</span>
                <span
                  className="flex-1 truncate"
                  onClick={(e) => { e.stopPropagation(); onSelectGroup(group) }}
                >
                  {group}
                </span>
                <span className="text-[10px] text-[#6c7086]">{enabledCount}</span>
              </button>

              {/* 目標 */}
              {isExpanded && (
                <div className="ml-3 border-l border-[#313244] pl-1">
                  {groupTargets.map((target) => {
                    const isSelected = selectedTarget?.id === target.id
                    return (
                      <button
                        key={target.id}
                        onClick={() => onSelectTarget(target)}
                        disabled={!target.enabled}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-left text-[11px]",
                          "disabled:opacity-30 disabled:cursor-not-allowed",
                          isSelected
                            ? "bg-[#89b4fa] text-[#1e1e2e]"
                            : "hover:bg-[#313244] text-[#bac2de]"
                        )}
                      >
                        <Circle className={cn(
                          "h-1.5 w-1.5 fill-current flex-shrink-0",
                          isSelected ? "text-[#1e1e2e]" : target.enabled ? "text-[#a6e3a1]" : "text-[#6c7086]"
                        )} />
                        <span className="truncate">{target.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部 */}
      <div className="h-7 px-2 flex items-center gap-1.5 border-t border-[#313244] text-[10px] text-[#6c7086]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#a6e3a1]"></span>
        {totalEnabled} online
      </div>
    </div>
  )
}
