'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Network, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Hop {
  hop: number
  ip: string
  hostname?: string
  rtt1?: number
  rtt2?: number
  rtt3?: number
  avgRtt?: number
  loss?: number
}

interface MTRResult {
  id: number
  timestamp: string
  hops: Hop[]
  destinationReached: boolean
  totalHops: number
}

interface MTRHistoryViewProps {
  targetId: number
  targetName: string
  targetHost: string
  selectedTimestamp?: string // 從圖表選擇的時間點
}

export default function MTRHistoryView({
  targetId,
  targetName,
  targetHost,
  selectedTimestamp,
}: MTRHistoryViewProps) {
  const [mtrHistory, setMtrHistory] = useState<MTRResult[]>([])
  const [selectedMTR, setSelectedMTR] = useState<MTRResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMTRHistory()
    const interval = setInterval(fetchMTRHistory, 60000) // 每分鐘更新
    return () => clearInterval(interval)
  }, [targetId])

  useEffect(() => {
    // 當從圖表選擇時間時，找到最接近的 MTR 記錄
    if (selectedTimestamp && mtrHistory.length > 0) {
      const targetTime = new Date(selectedTimestamp).getTime()
      const closest = mtrHistory.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - targetTime)
        const currDiff = Math.abs(new Date(curr.timestamp).getTime() - targetTime)
        return currDiff < prevDiff ? curr : prev
      })
      setSelectedMTR(closest)
    }
  }, [selectedTimestamp, mtrHistory])

  const fetchMTRHistory = async () => {
    try {
      const res = await fetch(`/api/mtr/${targetId}?limit=50`)
      if (res.ok) {
        const data = await res.json()
        if (data.results) {
          setMtrHistory(data.results)
          if (!selectedMTR && data.results.length > 0) {
            setSelectedMTR(data.results[0])
          }
        }
      }
    } catch (error) {
      console.error('獲取 MTR 歷史失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">載入中...</div>
        </CardContent>
      </Card>
    )
  }

  if (mtrHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            路由追蹤歷史
          </CardTitle>
          <CardDescription>{targetName} ({targetHost})</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground">尚無 MTR 數據</p>
          <p className="text-sm text-muted-foreground mt-2">系統每 5 分鐘自動執行一次 MTR</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              路由追蹤歷史
            </CardTitle>
            <CardDescription>{targetName} ({targetHost})</CardDescription>
          </div>

          {/* 時間選擇器 */}
          <Select
            value={selectedMTR?.id.toString()}
            onValueChange={(value) => {
              const mtr = mtrHistory.find((m) => m.id.toString() === value)
              if (mtr) setSelectedMTR(mtr)
            }}
          >
            <SelectTrigger className="w-[250px]">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mtrHistory.map((mtr) => (
                <SelectItem key={mtr.id} value={mtr.id.toString()}>
                  {format(new Date(mtr.timestamp), 'yyyy/MM/dd HH:mm:ss')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {selectedMTR && (
          <div className="space-y-4">
            {/* 資訊列 */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-3 border-b">
              <span>
                執行時間: {format(new Date(selectedMTR.timestamp), 'yyyy/MM/dd HH:mm:ss')}
              </span>
              <span>
                共 {selectedMTR.totalHops} 跳 •{' '}
                {selectedMTR.destinationReached ? '到達目的地' : '未到達'}
              </span>
            </div>

            {/* 路由表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2 w-12">#</th>
                    <th className="text-left py-2 px-2">IP 地址</th>
                    <th className="text-right py-2 px-2 w-24">RTT 1</th>
                    <th className="text-right py-2 px-2 w-24">RTT 2</th>
                    <th className="text-right py-2 px-2 w-24">RTT 3</th>
                    <th className="text-right py-2 px-2 w-24">平均</th>
                    <th className="text-right py-2 px-2 w-20">遺失</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMTR.hops.map((hop) => (
                    <tr
                      key={hop.hop}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30"
                    >
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">
                        {hop.hop}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">{hop.ip}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs">
                        {hop.rtt1 !== undefined ? `${hop.rtt1.toFixed(1)}` : '---'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-xs">
                        {hop.rtt2 !== undefined ? `${hop.rtt2.toFixed(1)}` : '---'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-xs">
                        {hop.rtt3 !== undefined ? `${hop.rtt3.toFixed(1)}` : '---'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-xs font-semibold">
                        {hop.avgRtt !== undefined ? `${hop.avgRtt.toFixed(1)}` : '---'}
                      </td>
                      <td className="py-2 px-2 text-right text-xs">
                        {hop.loss !== undefined && hop.loss > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {hop.loss.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 視覺化路徑 */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-3">路由路徑</h4>
              <div className="space-y-2">
                {selectedMTR.hops.map((hop, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div className="w-6 text-right text-muted-foreground font-mono">
                      {hop.hop}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          hop.loss && hop.loss > 0 ? 'bg-red-500' : 'bg-green-500'
                        )}
                      />
                      <div
                        className={cn(
                          'flex-1 p-2 rounded font-mono text-xs',
                          hop.loss && hop.loss > 0
                            ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {hop.ip}
                      </div>
                      <div className="w-16 text-right font-mono text-muted-foreground">
                        {hop.avgRtt !== undefined ? `${hop.avgRtt.toFixed(1)}ms` : '---'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
