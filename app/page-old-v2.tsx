'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity } from 'lucide-react'
import CompactSidebar from '@/components/CompactSidebar'
import SmokepingChart from '@/components/SmokepingChart'
import MTRHistoryView from '@/components/MTRHistoryView'

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<string>('24')
  const [loading, setLoading] = useState(true)
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | undefined>()

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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground text-sm">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* 緊湊側邊欄 */}
      <CompactSidebar
        targets={targets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
      />

      {/* 主內容 */}
      <div className="flex-1 overflow-auto">
        {selectedTarget ? (
          <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
            {/* 頂部標題欄 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{selectedTarget.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTarget.host} •{' '}
                  {selectedTarget.description || '網路監測'}
                </p>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">最近 1 小時</SelectItem>
                  <SelectItem value="6">最近 6 小時</SelectItem>
                  <SelectItem value="24">最近 24 小時</SelectItem>
                  <SelectItem value="168">最近 7 天</SelectItem>
                  <SelectItem value="720">最近 30 天</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Smokeping 風格圖表 */}
            <Card className="border-2 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <SmokepingChart
                  targetId={selectedTarget.id}
                  targetName={selectedTarget.name}
                  hours={parseInt(timeRange)}
                  onTimeSelect={setSelectedTimestamp}
                />
              </CardContent>
            </Card>

            {/* MTR 歷史記錄 */}
            <MTRHistoryView
              targetId={selectedTarget.id}
              targetName={selectedTarget.name}
              targetHost={selectedTarget.host}
              selectedTimestamp={selectedTimestamp}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Card className="border-2 border-dashed max-w-md">
              <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">未選擇監測目標</h3>
                <p className="text-sm text-muted-foreground">
                  從左側選擇一個監測目標來查看詳細資訊
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
