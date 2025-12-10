'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity } from 'lucide-react'
import CollapsibleTargetSidebar from '@/components/CollapsibleTargetSidebar'
import EnhancedLatencyChart from '@/components/EnhancedLatencyChart'
import MTRView from '@/components/MTRView'
import StatsCards from '@/components/StatsCards'

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<string>('24')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTargets()

    // 每 60 秒自動刷新數據
    const interval = setInterval(() => {
      fetchTargets()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets')
      const data = await res.json()
      setTargets(data.targets || [])

      // 如果有選中的目標，更新它的數據
      if (selectedTarget) {
        const updated = data.targets.find((t: any) => t.id === selectedTarget.id)
        if (updated) {
          setSelectedTarget(updated)
        }
      } else if (data.targets.length > 0) {
        // 選擇第一個啟用的目標
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 側邊欄 */}
      <CollapsibleTargetSidebar
        targets={targets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
      />

      {/* 主內容區 */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* 標題 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">網路監測系統</h1>
              <p className="text-muted-foreground mt-1">即時延遲與網路效能追蹤</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                  <SelectValue placeholder="時間範圍" />
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
          </div>

          {selectedTarget ? (
            <>
              {/* 統計卡片 */}
              <StatsCards targetId={selectedTarget.id} hours={parseInt(timeRange)} />

              {/* 頁籤切換 */}
              <Tabs defaultValue="chart" className="space-y-4">
                <TabsList className="bg-white dark:bg-slate-800">
                  <TabsTrigger value="chart">延遲圖表</TabsTrigger>
                  <TabsTrigger value="mtr">路由追蹤 (MTR)</TabsTrigger>
                </TabsList>

                {/* 圖表頁籤 */}
                <TabsContent value="chart" className="space-y-4">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        {selectedTarget.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedTarget.host} •{' '}
                        {selectedTarget.description || '無描述'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnhancedLatencyChart
                        targetId={selectedTarget.id}
                        hours={parseInt(timeRange)}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* MTR 頁籤 */}
                <TabsContent value="mtr" className="space-y-4">
                  <MTRView
                    targetId={selectedTarget.id}
                    targetName={selectedTarget.name}
                    targetHost={selectedTarget.host}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">未選擇監測目標</h3>
                <p className="text-muted-foreground">
                  從側邊欄選擇一個監測目標，或編輯 config/smokeping.conf 添加更多
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
