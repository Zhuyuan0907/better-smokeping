'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Hop {
  hop: number
  ip: string
  hostname?: string
  rtt1?: number
  rtt2?: number
  rtt3?: number
  avgRtt?: number
  minRtt?: number
  maxRtt?: number
  stdDev?: number
  loss?: number
  sent?: number
}

interface MTRResult {
  id: number
  timestamp: string
  hops: Hop[]
  destinationReached: boolean
  totalHops: number
}

interface SimpleMTRViewProps {
  targetId: number
  targetHost: string
  selectedTimestamp?: string // 從圖表點擊的時間
}

export default function SimpleMTRView({
  targetId,
  targetHost,
  selectedTimestamp,
}: SimpleMTRViewProps) {
  const [mtrHistory, setMtrHistory] = useState<MTRResult[]>([])
  const [currentMTR, setCurrentMTR] = useState<MTRResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMTRHistory()
    const interval = setInterval(fetchMTRHistory, 60000)
    return () => clearInterval(interval)
  }, [targetId])

  useEffect(() => {
    if (selectedTimestamp && mtrHistory.length > 0) {
      // 找到最接近選定時間的 MTR 記錄
      const targetTime = new Date(selectedTimestamp).getTime()
      const closest = mtrHistory.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - targetTime)
        const currDiff = Math.abs(new Date(curr.timestamp).getTime() - targetTime)
        return currDiff < prevDiff ? curr : prev
      })
      setCurrentMTR(closest)
    } else if (!selectedTimestamp && mtrHistory.length > 0) {
      // 沒有選定時間時，顯示最新的
      setCurrentMTR(mtrHistory[0])
    }
  }, [selectedTimestamp, mtrHistory])

  const fetchMTRHistory = async () => {
    try {
      const res = await fetch(`/api/mtr/${targetId}?limit=100`)
      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          setMtrHistory(data.results)
          if (!currentMTR) {
            setCurrentMTR(data.results[0])
          }
        }
      }
    } catch (error) {
      console.error('獲取 MTR 失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
          路由追蹤 (MTR)
        </h3>
        <div className="text-sm text-muted-foreground">載入中...</div>
      </div>
    )
  }

  if (!currentMTR) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
          路由追蹤 (MTR)
        </h3>
        <div className="text-sm text-muted-foreground">
          尚無 MTR 數據 • 系統每 5 分鐘自動執行
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          路由追蹤 (MTR)
        </h3>
        <div className="text-xs text-muted-foreground">
          {format(new Date(currentMTR.timestamp), 'yyyy/MM/dd HH:mm:ss')} •
          共 {currentMTR.totalHops} 跳
        </div>
      </div>

      {/* MTR 表格 - 仿照 mtr 命令輸出 */}
      <div className="font-mono text-xs">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-600 dark:text-slate-400">
              <th className="py-2 px-2 font-normal">#</th>
              <th className="py-2 px-2 font-normal">Host</th>
              <th className="py-2 px-2 text-right font-normal">Loss%</th>
              <th className="py-2 px-2 text-right font-normal">Snt</th>
              <th className="py-2 px-2 text-right font-normal">Last</th>
              <th className="py-2 px-2 text-right font-normal">Avg</th>
              <th className="py-2 px-2 text-right font-normal">Best</th>
              <th className="py-2 px-2 text-right font-normal">Wrst</th>
              <th className="py-2 px-2 text-right font-normal">StDev</th>
            </tr>
          </thead>
          <tbody>
            {currentMTR.hops.map((hop) => (
              <tr
                key={hop.hop}
                className="hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                <td className="py-1 px-2 text-slate-500 dark:text-slate-500">
                  {hop.hop}.
                </td>
                <td className="py-1 px-2">
                  {hop.hostname && hop.hostname !== hop.ip ? (
                    <span>
                      {hop.hostname} <span className="text-slate-400 dark:text-slate-600">({hop.ip})</span>
                    </span>
                  ) : (
                    hop.ip
                  )}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.loss !== undefined ? (
                    <span className={hop.loss > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                      {hop.loss.toFixed(1)}%
                    </span>
                  ) : (
                    '0.0%'
                  )}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.sent || 10}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.rtt3 !== undefined ? hop.rtt3.toFixed(1) : '---'}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.avgRtt !== undefined ? hop.avgRtt.toFixed(1) : '---'}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.minRtt !== undefined ? hop.minRtt.toFixed(1) : hop.avgRtt !== undefined ? hop.avgRtt.toFixed(1) : '---'}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.maxRtt !== undefined ? hop.maxRtt.toFixed(1) : hop.avgRtt !== undefined ? hop.avgRtt.toFixed(1) : '---'}
                </td>
                <td className="py-1 px-2 text-right">
                  {hop.stdDev !== undefined ? hop.stdDev.toFixed(1) : '0.0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
