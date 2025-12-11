'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Moon, Sun, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'

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
  const [searchTerm, setSearchTerm] = useState('')

  // 獲取所有分組，預設全部折疊
  const allGroups = Array.from(new Set(targets.map(t => t.group || '未分類')))
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(allGroups))

  const groupedTargets = targets.reduce((acc, target) => {
    const group = target.group || '未分類'
    if (!acc[group]) acc[group] = []
    acc[group].push(target)
    return acc
  }, {} as Record<string, Target[]>)

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // 篩選目標
  const filteredGroups = Object.entries(groupedTargets).reduce((acc, [group, groupTargets]) => {
    const filtered = groupTargets.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.host.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (filtered.length > 0) acc[group] = filtered
    return acc
  }, {} as Record<string, Target[]>)

  return (
    <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
      {/* 標題區 */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">監測目標</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-7 w-7"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* 搜尋框 */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜尋..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* 目標列表 */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredGroups).map(([group, groupTargets]) => {
          const isCollapsed = collapsedGroups.has(group)

          return (
            <div key={group}>
              {/* 分組標題 */}
              <div className="flex items-center">
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => onSelectGroup(group)}
                  className={cn(
                    "flex-1 flex items-center justify-between py-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-xs font-medium",
                    selectedGroup === group && !selectedTarget
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  )}
                >
                  <span>{group}</span>
                  <span className="text-[10px] opacity-70">
                    {groupTargets.filter((t) => t.enabled).length}
                  </span>
                </button>
              </div>

              {/* 目標 */}
              {!isCollapsed &&
                groupTargets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => onSelectTarget(target)}
                    disabled={!target.enabled}
                    className={cn(
                      'w-full text-left px-3 py-1.5 pl-7 text-xs transition-colors',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      selectedTarget?.id === target.id
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-900'
                    )}
                  >
                    <div className="truncate">{target.name}</div>
                    <div className="text-[10px] opacity-70 truncate">{target.host}</div>
                  </button>
                ))}
            </div>
          )
        })}
      </div>

      {/* 底部資訊 */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] text-muted-foreground">Better Smokeping v2.0</p>
      </div>
    </div>
  )
}
