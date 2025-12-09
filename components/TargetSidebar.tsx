'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Activity, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TargetSidebarProps {
  targets: any[]
  selectedTarget: any
  onSelectTarget: (target: any) => void
  onAddTarget: () => void
  onRefresh: () => void
}

export default function TargetSidebar({
  targets,
  selectedTarget,
  onSelectTarget,
  onAddTarget,
  onRefresh,
}: TargetSidebarProps) {
  const groupedTargets = targets.reduce((acc, target) => {
    const group = target.group || 'default'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(target)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Targets</h2>
          <Button size="icon" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button className="w-full" onClick={onAddTarget}>
          <Plus className="h-4 w-4 mr-2" />
          Add Target
        </Button>
      </div>

      {/* Target List */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {Object.entries(groupedTargets).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No targets configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Add Target&quot; to get started
            </p>
          </div>
        ) : (
          Object.entries(groupedTargets).map(([group, groupTargets]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group}
              </h3>
              <div className="space-y-1">
                {groupTargets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => onSelectTarget(target)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      selectedTarget?.id === target.id
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {target.name}
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate opacity-80">
                          {target.host}
                        </p>
                      </div>
                      {!target.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Disabled
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Better Smokeping v1.0
        </p>
      </div>
    </div>
  )
}
