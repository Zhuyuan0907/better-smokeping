'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity } from 'lucide-react'
import CompactSidebar from '@/components/CompactSidebar'
import SmokepingStyleChart, { InteractiveTimeline } from '@/components/SmokepingStyleChart'
import SimpleMTRView from '@/components/SimpleMTRView'
import GroupOverview from '@/components/GroupOverview'

type ViewMode = 'group-overview' | 'target-detail' | 'multi-target'

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('group-overview')
  const [timeRange, setTimeRange] = useState<string>('24')
  const [loading, setLoading] = useState(true)
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | undefined>()
  const [pingData, setPingData] = useState<any[]>([])
  const [zoomTimeRange, setZoomTimeRange] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    fetchTargets()
    const interval = setInterval(fetchTargets, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets')
      const data = await res.json()
      setTargets(data.targets || [])

      if (selectedTarget) {
        const updated = data.targets.find((t: any) => t.id === selectedTarget.id)
        if (updated) setSelectedTarget(updated)
      } else if (data.targets.length > 0) {
        const firstEnabled = data.targets.find((t: any) => t.enabled)
        setSelectedTarget(firstEnabled || data.targets[0])
      }
    } catch (error) {
      console.error('獲取目標失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground text-sm">載入中...</p>
        </div>
      </div>
    )
  }

  const handleSelectTarget = (target: any) => {
    setSelectedTarget(target)
    setSelectedGroup(null)
    setViewMode('target-detail')
    // 重置狀態，避免顯示舊數據
    setSelectedTimestamp(undefined)
    setZoomTimeRange(null)
    setPingData([])
  }

  const handleSelectGroup = (group: string) => {
    setSelectedGroup(group)
    setSelectedTarget(null)
    setViewMode('group-overview')
    // 重置狀態，避免顯示舊數據
    setSelectedTimestamp(undefined)
    setZoomTimeRange(null)
    setPingData([])
  }

  // 獲取當前選擇的目標列表
  const currentTargets = selectedGroup
    ? targets.filter(t => (t.group || '未分類') === selectedGroup && t.enabled)
    : selectedTarget
    ? [selectedTarget]
    : []

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {/* 側邊欄 */}
      <CompactSidebar
        targets={targets}
        selectedTarget={selectedTarget}
        selectedGroup={selectedGroup}
        onSelectTarget={handleSelectTarget}
        onSelectGroup={handleSelectGroup}
      />

      {/* 主內容 */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'group-overview' && selectedGroup ? (
          <GroupOverview
            group={selectedGroup}
            targets={currentTargets}
            hours={parseInt(timeRange)}
            onTargetClick={handleSelectTarget}
          />
        ) : currentTargets.length > 0 ? (
          <div className="p-4 space-y-3">
            {/* 頂部標題 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTarget?.name}
                  <span className="ml-2 text-xs font-normal text-slate-500">{selectedTarget?.host}</span>
                </h1>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1h</SelectItem>
                  <SelectItem value="6">6h</SelectItem>
                  <SelectItem value="24">24h</SelectItem>
                  <SelectItem value="168">7d</SelectItem>
                  <SelectItem value="720">30d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 圖表 */}
            <SmokepingStyleChart
              targets={currentTargets}
              hours={parseInt(timeRange)}
              selectedTimestamp={selectedTimestamp}
              onTimeSelect={setSelectedTimestamp}
              onDataLoad={setPingData}
              onZoomChange={setZoomTimeRange}
            />

            {/* 時間軸 */}
            <InteractiveTimeline
              data={pingData}
              selectedTimestamp={selectedTimestamp}
              onTimeSelect={setSelectedTimestamp}
              timeRange={zoomTimeRange}
              fullTimeRange={parseInt(timeRange)}
            />

            {/* MTR */}
            {!selectedGroup && selectedTarget && (
              <SimpleMTRView
                targetId={selectedTarget.id}
                targetHost={selectedTarget.host}
                selectedTimestamp={selectedTimestamp}
                timeRange={zoomTimeRange}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">未選擇監測目標</h3>
              <p className="text-sm text-muted-foreground">
                從左側選擇一個監測目標
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
