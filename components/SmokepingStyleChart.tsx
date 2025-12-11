'use client'

import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import InteractiveTimeline from './InteractiveTimeline'

interface PingData {
  timestamp: string
  avgRtt: number | null
  minRtt: number | null
  maxRtt: number | null
  packetLoss: number
  jitter: number | null
}

interface SmokepingStyleChartProps {
  targetId: number
  targetName: string
  hours?: number
  selectedTimestamp?: string
  onTimeSelect?: (timestamp: string) => void
}

export default function SmokepingStyleChart({
  targetId,
  targetName,
  hours = 24,
  selectedTimestamp,
  onTimeSelect,
}: SmokepingStyleChartProps) {
  const [data, setData] = useState<PingData[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [stats, setStats] = useState({
    median: 0,
    avg: 0,
    max: 0,
    min: 0,
    now: 0,
    sd: 0,
    avgLoss: 0,
    maxLoss: 0,
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [targetId, hours])

  useEffect(() => {
    if (data.length > 0 && canvasRef.current) {
      drawChart()
    }
  }, [data, hoveredIndex, selectedTimestamp])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/ping/${targetId}?hours=${hours}`)
      const result = await res.json()

      if (result.results && result.results.length > 0) {
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
        const rtts = validRtts.map((d: PingData) => d.avgRtt || 0)
        const sorted = [...rtts].sort((a, b) => a - b)

        setStats({
          median: sorted[Math.floor(sorted.length / 2)] || 0,
          avg: rtts.reduce((a: number, b: number) => a + b, 0) / rtts.length || 0,
          max: Math.max(...rtts) || 0,
          min: Math.min(...rtts) || 0,
          now: rtts[rtts.length - 1] || 0,
          sd: calculateStdDev(rtts),
          avgLoss: formatted.reduce((sum: number, d: PingData) => sum + d.packetLoss, 0) / formatted.length,
          maxLoss: Math.max(...formatted.map((d: PingData) => d.packetLoss)),
        })
      }
    } catch (error) {
      console.error('獲取數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStdDev = (values: number[]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    return Math.sqrt(avgSquareDiff)
  }

  const getColorForLoss = (loss: number) => {
    if (loss === 0) return '#22c55e' // 綠色 - 無掉包
    if (loss < 2) return '#60a5fa' // 淺藍 - 1包
    if (loss < 5) return '#3b82f6' // 藍色 - 2包
    if (loss < 10) return '#a855f7' // 紫色 - 3包
    if (loss < 20) return '#f97316' // 橘色 - 4-7包
    if (loss < 50) return '#ef4444' // 紅色 - 8-15包
    return '#7f1d1d' // 深紅 - 30/30
  }

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 40, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 清空畫布
    ctx.clearRect(0, 0, width, height)

    // 背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 找出最大值
    const maxRtt = Math.max(...data.map((d) => d.maxRtt || 0))
    const yScale = chartHeight / (maxRtt * 1.1)

    // 繪製網格
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // 繪製數據線條（分段著色）
    for (let i = 0; i < data.length - 1; i++) {
      const d1 = data[i]
      const d2 = data[i + 1]

      if (d1.avgRtt === null || d2.avgRtt === null) continue

      const x1 = padding.left + (chartWidth / (data.length - 1)) * i
      const x2 = padding.left + (chartWidth / (data.length - 1)) * (i + 1)
      const y1 = padding.top + chartHeight - d1.avgRtt * yScale
      const y2 = padding.top + chartHeight - d2.avgRtt * yScale

      // 根據掉包率選擇顏色
      const color = getColorForLoss(d1.packetLoss)

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // 繪製掉包的垂直線（煙霧效果）
      if (d1.packetLoss > 0 && d1.minRtt !== null && d1.maxRtt !== null) {
        const yMin = padding.top + chartHeight - d1.minRtt * yScale
        const yMax = padding.top + chartHeight - d1.maxRtt * yScale

        ctx.strokeStyle = color
        ctx.globalAlpha = 0.3
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, yMin)
        ctx.lineTo(x1, yMax)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // Y 軸標籤
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const value = (maxRtt * 1.1 / 5) * (5 - i)
      const y = padding.top + (chartHeight / 5) * i
      ctx.fillText(value.toFixed(0) + ' ms', padding.left - 10, y + 4)
    }

    // X 軸標籤（時間）
    ctx.textAlign = 'center'
    const timeLabels = 6
    for (let i = 0; i < timeLabels; i++) {
      const index = Math.floor((data.length / (timeLabels - 1)) * i)
      if (index >= data.length) continue
      const x = padding.left + (chartWidth / (data.length - 1)) * index
      const time = format(new Date(data[index].timestamp), 'HH:mm')
      ctx.fillText(time, x, height - 10)
    }

    // 選中的時間點（從時間軸選擇）
    if (selectedTimestamp) {
      const selectedIndex = data.findIndex(d => d.timestamp === selectedTimestamp)
      if (selectedIndex !== -1) {
        const x = padding.left + (chartWidth / (data.length - 1)) * selectedIndex

        // 繪製選中的垂直線
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 懸停提示
    if (hoveredIndex !== null && data[hoveredIndex]) {
      const d = data[hoveredIndex]
      const x = padding.left + (chartWidth / (data.length - 1)) * hoveredIndex

      // 繪製垂直線
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()
      ctx.setLineDash([])

      // 提示框
      if (d.avgRtt !== null) {
        const y = padding.top + chartHeight - d.avgRtt * yScale
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(x + 10, y - 40, 150, 35)
        ctx.fillStyle = '#ffffff'
        ctx.font = '11px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`${format(new Date(d.timestamp), 'HH:mm:ss')}`, x + 15, y - 25)
        ctx.fillText(`RTT: ${d.avgRtt.toFixed(1)} ms`, x + 15, y - 12)
        if (d.packetLoss > 0) {
          ctx.fillText(`Loss: ${d.packetLoss.toFixed(1)}%`, x + 15, y + 1)
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const chartWidth = rect.width - padding - 40

    const index = Math.round(((x - padding) / chartWidth) * (data.length - 1))

    if (index >= 0 && index < data.length) {
      setHoveredIndex(index)
      if (onTimeSelect) {
        onTimeSelect(data[index].timestamp)
      }
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center text-muted-foreground">載入中...</div>
  }

  return (
    <div className="space-y-2">
      {/* 統計資訊 - Smokeping 風格 */}
      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
        <div>
          median rtt: <span className="font-semibold">{stats.median.toFixed(1)} ms</span> avg{' '}
          <span className="font-semibold">{stats.avg.toFixed(1)} ms</span> max{' '}
          <span className="font-semibold">{stats.max.toFixed(1)} ms</span> min{' '}
          <span className="font-semibold">{stats.min.toFixed(1)} ms</span> now{' '}
          <span className="font-semibold">{stats.now.toFixed(1)} ms</span> sd{' '}
          <span className="font-semibold">{stats.sd.toFixed(1)}</span> am/s
        </div>
        <div>
          packet loss: <span className="font-semibold">{stats.avgLoss.toFixed(2)} %</span> avg{' '}
          <span className="font-semibold">{stats.maxLoss.toFixed(2)} %</span> max
        </div>
        <div className="flex items-center gap-2">
          <span>loss color:</span>
          <span className="inline-block w-4 h-3 bg-green-500"></span> 0
          <span className="inline-block w-4 h-3 bg-blue-400"></span> 1
          <span className="inline-block w-4 h-3 bg-blue-600"></span> 2
          <span className="inline-block w-4 h-3 bg-purple-500"></span> 3
          <span className="inline-block w-4 h-3 bg-orange-500"></span> 4-7
          <span className="inline-block w-4 h-3 bg-red-500"></span> 8-15
          <span className="inline-block w-4 h-3 bg-red-900"></span> 30/30
        </div>
      </div>

      {/* 圖表 */}
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: '400px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* 互動式時間軸 */}
      {data.length > 0 && (
        <InteractiveTimeline
          data={data}
          selectedTimestamp={selectedTimestamp}
          onTimeSelect={(timestamp) => {
            if (onTimeSelect) {
              onTimeSelect(timestamp)
            }
          }}
        />
      )}
    </div>
  )
}
