'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Target {
  id: number
  name: string
  host: string
  enabled: boolean
  group: string | null
}

interface PingData {
  timestamp: string
  avgRtt: number | null
  minRtt: number | null
  maxRtt: number | null
  packetLoss: number
}

interface GroupOverviewProps {
  group: string
  targets: Target[]
  hours: number
  onTargetClick: (target: Target) => void
}

export default function GroupOverview({ group, targets, hours, onTargetClick }: GroupOverviewProps) {
  const [targetsData, setTargetsData] = useState<Map<number, PingData[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 60000)
    return () => clearInterval(interval)
  }, [targets, hours])

  const fetchAllData = async () => {
    try {
      const results = await Promise.all(
        targets.map(async (target) => {
          const limit = hours <= 24 ? 2000 : hours <= 168 ? 15000 : 50000
          const res = await fetch(`/api/ping/${target.id}?hours=${hours}&limit=${limit}`)
          const result = await res.json()

          if (result.results && result.results.length > 0) {
            const formatted = result.results.reverse().map((item: any) => ({
              timestamp: item.timestamp,
              avgRtt: item.avgRtt,
              minRtt: item.minRtt,
              maxRtt: item.maxRtt,
              packetLoss: item.packetLoss || 0,
            }))
            return { id: target.id, data: formatted }
          }
          return { id: target.id, data: [] }
        })
      )

      const dataMap = new Map()
      results.forEach(r => dataMap.set(r.id, r.data))
      setTargetsData(dataMap)
    } catch (error) {
      console.error('獲取群組數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderMiniChart = (data: PingData[], target: Target) => {
    if (data.length === 0) {
      return <div className="text-xs text-slate-400">無資料</div>
    }

    // 計算統計
    const validRtts = data.filter(d => d.avgRtt !== null).map(d => d.avgRtt!)
    const losses = data.map(d => d.packetLoss)

    if (validRtts.length === 0) {
      return <div className="text-xs text-slate-400">無有效數據</div>
    }

    const avg = validRtts.reduce((a, b) => a + b, 0) / validRtts.length
    const max = Math.max(...validRtts)
    const min = Math.min(...validRtts)
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length
    const maxLoss = Math.max(...losses)
    const now = validRtts[validRtts.length - 1]

    // 繪製迷你圖
    const maxRtt = Math.max(...data.map(d => d.maxRtt || 0))
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d.avgRtt || 0) / maxRtt) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="flex-1">
        <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={maxLoss > 0 ? '#ef4444' : '#22c55e'}
            strokeWidth="1"
          />
        </svg>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          median: {avg.toFixed(1)} ms | max: {max.toFixed(1)} ms | loss: {avgLoss.toFixed(2)}%
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">載入中...</div>
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{group}</h2>

      <div className="space-y-2">
        {targets.map(target => {
          const data = targetsData.get(target.id) || []
          return (
            <div
              key={target.id}
              onClick={() => onTargetClick(target)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-48">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{target.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{target.host}</div>
                </div>
                {renderMiniChart(data, target)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
