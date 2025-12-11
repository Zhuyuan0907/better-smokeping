'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity } from 'lucide-react'
import CompactSidebar from '@/components/CompactSidebar'
import SmokepingStyleChart, { InteractiveTimeline } from '@/components/SmokepingStyleChart'
import SimpleMTRView from '@/components/SimpleMTRView'

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
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

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {/* 側邊欄 */}
      <CompactSidebar
        targets={targets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
      />

      {/* 主內容 */}
      <div className="flex-1 overflow-auto">
        {selectedTarget ? (
          <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
            {/* 頂部標題 - 簡化 */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedTarget.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedTarget.host}
                  {selectedTarget.description && ` • ${selectedTarget.description}`}
                </p>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 小時</SelectItem>
                  <SelectItem value="6">6 小時</SelectItem>
                  <SelectItem value="24">24 小時</SelectItem>
                  <SelectItem value="168">7 天</SelectItem>
                  <SelectItem value="720">30 天</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 圖表 - Smokeping 風格 */}
            <div>
              <SmokepingStyleChart
                targetId={selectedTarget.id}
                targetName={selectedTarget.name}
                hours={parseInt(timeRange)}
                selectedTimestamp={selectedTimestamp}
                onTimeSelect={setSelectedTimestamp}
                onDataLoad={setPingData}
                onZoomChange={setZoomTimeRange}
              />
            </div>

            {/* 互動式時間軸 - 放在圖表與 MTR 之間 */}
            {pingData.length > 0 && (
              <div className="mt-4">
                <InteractiveTimeline
                  data={pingData}
                  selectedTimestamp={selectedTimestamp}
                  onTimeSelect={setSelectedTimestamp}
                />
              </div>
            )}

            {/* MTR - 簡化樣式 */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <SimpleMTRView
                targetId={selectedTarget.id}
                targetHost={selectedTarget.host}
                selectedTimestamp={selectedTimestamp}
                timeRange={zoomTimeRange}
              />
            </div>
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
