'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

interface PingData {
  timestamp: string
  avgRtt: number | null
  minRtt: number | null
  maxRtt: number | null
  packetLoss: number
  jitter: number | null
}

interface EnhancedLatencyChartProps {
  targetId: number
  hours?: number
}

export default function EnhancedLatencyChart({ targetId, hours = 24 }: EnhancedLatencyChartProps) {
  const [data, setData] = useState<PingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // 每分鐘更新
    return () => clearInterval(interval)
  }, [targetId, hours])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/ping/${targetId}?hours=${hours}`)
      const result = await res.json()

      if (result.results) {
        const formatted = result.results.map((item: any) => ({
          timestamp: item.timestamp,
          avgRtt: item.avgRtt,
          minRtt: item.minRtt,
          maxRtt: item.maxRtt,
          packetLoss: item.packetLoss || 0,
          jitter: item.jitter,
        }))
        setData(formatted)
      }
    } catch (error) {
      console.error('獲取數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2">
            {format(new Date(payload[0].payload.timestamp), 'MM/dd HH:mm')}
          </p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(2)} {entry.unit || 'ms'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">暫無數據</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 延遲圖表 */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">往返時間 (RTT)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => format(new Date(time), 'HH:mm')}
              className="text-xs"
            />
            <YAxis
              label={{ value: '延遲 (ms)', angle: -90, position: 'insideLeft' }}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Brush dataKey="timestamp" height={30} stroke="#8884d8" />

            {/* RTT 線條 */}
            <Line
              type="monotone"
              dataKey="avgRtt"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="平均延遲"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="minRtt"
              stroke="#10b981"
              strokeWidth={1}
              dot={false}
              name="最小延遲"
              connectNulls
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="maxRtt"
              stroke="#ef4444"
              strokeWidth={1}
              dot={false}
              name="最大延遲"
              connectNulls
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 封包遺失圖表 */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">封包遺失率</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => format(new Date(time), 'HH:mm')}
              className="text-xs"
            />
            <YAxis
              label={{ value: '遺失率 (%)', angle: -90, position: 'insideLeft' }}
              className="text-xs"
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#666" />

            {/* 封包遺失直條圖 */}
            <Bar
              dataKey="packetLoss"
              fill="#ef4444"
              name="封包遺失"
              unit="%"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Jitter 圖表 */}
      {data.some((d) => d.jitter !== null) && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">抖動 (Jitter)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(time) => format(new Date(time), 'HH:mm')}
                className="text-xs"
              />
              <YAxis
                label={{ value: '抖動 (ms)', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="jitter"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="抖動"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
