'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
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

interface SmokepingChartProps {
  targetId: number
  targetName: string
  hours?: number
  onTimeSelect?: (timestamp: string) => void
}

export default function SmokepingChart({
  targetId,
  targetName,
  hours = 24,
  onTimeSelect,
}: SmokepingChartProps) {
  const [data, setData] = useState<PingData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    avgRtt: 0,
    minRtt: 0,
    maxRtt: 0,
    avgLoss: 0,
    avgJitter: 0,
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [targetId, hours])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/ping/${targetId}?hours=${hours}`)
      const result = await res.json()

      if (result.results && result.results.length > 0) {
        // 反轉數組：最舊的在左邊，最新的在右邊
        const formatted = result.results.reverse().map((item: any) => ({
          timestamp: item.timestamp,
          avgRtt: item.avgRtt,
          minRtt: item.minRtt,
          maxRtt: item.maxRtt,
          packetLoss: item.packetLoss || 0,
          jitter: item.jitter,
        }))

        setData(formatted)

        // 計算統計
        const validRtts = formatted.filter((d: PingData) => d.avgRtt !== null)
        const validJitters = formatted.filter((d: PingData) => d.jitter !== null)

        setStats({
          avgRtt: validRtts.reduce((sum, d) => sum + (d.avgRtt || 0), 0) / validRtts.length,
          minRtt: Math.min(...validRtts.map((d) => d.minRtt || Infinity)),
          maxRtt: Math.max(...validRtts.map((d) => d.maxRtt || 0)),
          avgLoss:
            formatted.reduce((sum, d) => sum + d.packetLoss, 0) / formatted.length,
          avgJitter:
            validJitters.length > 0
              ? validJitters.reduce((sum, d) => sum + (d.jitter || 0), 0) / validJitters.length
              : 0,
        })
      }
    } catch (error) {
      console.error('獲取數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      if (onTimeSelect) {
        // 當滑鼠懸停時，可以記錄這個時間點
        onTimeSelect(data.timestamp)
      }

      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl">
          <p className="text-xs font-semibold mb-2 text-slate-900 dark:text-slate-100">
            {format(new Date(data.timestamp), 'yyyy/MM/dd HH:mm:ss')}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <p
                key={entry.dataKey}
                className="text-xs flex items-center justify-between gap-4"
                style={{ color: entry.color }}
              >
                <span>{entry.name}:</span>
                <span className="font-mono font-semibold">
                  {entry.value?.toFixed(2)} {entry.unit || entry.dataKey === 'packetLoss' ? '%' : 'ms'}
                </span>
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div className="text-muted-foreground">暫無數據</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 統計資訊 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-muted-foreground">平均:</span>
            <span className="ml-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
              {stats.avgRtt.toFixed(2)} ms
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">最小:</span>
            <span className="ml-2 font-mono font-semibold text-green-600 dark:text-green-400">
              {stats.minRtt.toFixed(2)} ms
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">最大:</span>
            <span className="ml-2 font-mono font-semibold text-red-600 dark:text-red-400">
              {stats.maxRtt.toFixed(2)} ms
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">平均遺失:</span>
            <span className="ml-2 font-mono font-semibold text-orange-600 dark:text-orange-400">
              {stats.avgLoss.toFixed(2)} %
            </span>
          </div>
          {stats.avgJitter > 0 && (
            <div>
              <span className="text-muted-foreground">平均抖動:</span>
              <span className="ml-2 font-mono font-semibold text-purple-600 dark:text-purple-400">
                {stats.avgJitter.toFixed(2)} ms
              </span>
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {data.length} 個數據點 • 每 60 秒更新
        </div>
      </div>

      {/* 合併圖表 */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />

            {/* X 軸：時間（左舊右新） */}
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => format(new Date(time), 'HH:mm')}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{ value: '時間', position: 'insideBottom', offset: -10 }}
            />

            {/* 左 Y 軸：RTT (ms) */}
            <YAxis
              yAxisId="rtt"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{ value: 'RTT (ms)', angle: -90, position: 'insideLeft' }}
            />

            {/* 右 Y 軸：封包遺失率 (%) */}
            <YAxis
              yAxisId="loss"
              orientation="right"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{ value: '遺失率 (%)', angle: 90, position: 'insideRight' }}
              domain={[0, 100]}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '13px' }}
              iconType="line"
            />

            {/* RTT 線條 */}
            <Line
              yAxisId="rtt"
              type="monotone"
              dataKey="avgRtt"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="平均 RTT"
              connectNulls
            />
            <Line
              yAxisId="rtt"
              type="monotone"
              dataKey="minRtt"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              name="最小 RTT"
              connectNulls
            />
            <Line
              yAxisId="rtt"
              type="monotone"
              dataKey="maxRtt"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
              name="最大 RTT"
              connectNulls
            />

            {/* Jitter 線條 */}
            {data.some((d) => d.jitter !== null) && (
              <Line
                yAxisId="rtt"
                type="monotone"
                dataKey="jitter"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                name="抖動"
                connectNulls
              />
            )}

            {/* 封包遺失 - 使用半透明區域顯示 */}
            <Bar
              yAxisId="loss"
              dataKey="packetLoss"
              fill="#f97316"
              fillOpacity={0.3}
              name="封包遺失"
              radius={[4, 4, 0, 0]}
            />

            {/* 時間範圍選擇器 */}
            <Brush
              dataKey="timestamp"
              height={30}
              stroke="#3b82f6"
              tickFormatter={(time) => format(new Date(time), 'HH:mm')}
              fill="#f1f5f9"
              className="dark:fill-slate-800"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
