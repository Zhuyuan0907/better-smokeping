'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Activity, Moon, Sun } from 'lucide-react'
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

interface TargetSidebarProps {
  targets: Target[]
  selectedTarget: Target | null
  onSelectTarget: (target: Target) => void
}

export default function CollapsibleTargetSidebar({
  targets,
  selectedTarget,
  onSelectTarget,
}: TargetSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // 按分組整理目標
  const groupedTargets = targets.reduce((acc, target) => {
    const group = target.group || '未分類'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(target)
    return acc
  }, {} as Record<string, Target[]>)

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col">
      {/* 側邊欄標題 */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">監測目標</h2>
          <Button size="icon" variant="ghost" onClick={toggleTheme} title="切換主題">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          共 {targets.filter((t) => t.enabled).length} 個啟用目標
        </p>
      </div>

      {/* 目標列表 */}
      <div className="flex-1 overflow-auto">
        {Object.entries(groupedTargets).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">沒有配置監測目標</p>
            <p className="text-xs text-muted-foreground mt-2">
              編輯 config/smokeping.conf 來添加監測目標
            </p>
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(groupedTargets).map(([group, groupTargets]) => {
              const isCollapsed = collapsedGroups.has(group)
              const enabledCount = groupTargets.filter((t) => t.enabled).length

              return (
                <div key={group} className="mb-1">
                  {/* 分組標題 */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">{group}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {enabledCount}/{groupTargets.length}
                    </span>
                  </button>

                  {/* 目標列表 */}
                  {!isCollapsed && (
                    <div className="ml-2">
                      {groupTargets.map((target) => (
                        <button
                          key={target.id}
                          onClick={() => onSelectTarget(target)}
                          disabled={!target.enabled}
                          className={cn(
                            'w-full text-left px-4 py-2.5 ml-4 my-0.5 rounded-lg transition-all',
                            'disabled:opacity-40 disabled:cursor-not-allowed',
                            selectedTarget?.id === target.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <Activity
                              className={cn(
                                'h-3.5 w-3.5 flex-shrink-0 mt-0.5',
                                target.enabled ? 'text-green-500' : 'text-gray-400'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{target.name}</div>
                              <div className="text-xs opacity-80 truncate mt-0.5">
                                {target.host}
                              </div>
                              {target.description && (
                                <div className="text-xs opacity-60 truncate mt-0.5">
                                  {target.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部資訊 */}
      <div className="p-4 border-t text-center">
        <p className="text-xs text-muted-foreground">Better Smokeping v2.0</p>
        <p className="text-xs text-muted-foreground mt-1">網路監測系統</p>
      </div>
    </div>
  )
}
