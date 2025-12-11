'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'

interface PingData {
  timestamp: string
  avgRtt: number | null
  minRtt: number | null
  maxRtt: number | null
  packetLoss: number
  jitter: number | null
}

interface TimelinePoint {
  timestamp: string
  hasAnomaly: boolean
  packetLoss: number
  rttSpike: boolean
  avgRtt: number | null
}

interface InteractiveTimelineProps {
  data: PingData[]
  selectedTimestamp?: string
  onTimeSelect: (timestamp: string) => void
}

export default function InteractiveTimeline({
  data,
  selectedTimestamp,
  onTimeSelect,
}: InteractiveTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([])

  useEffect(() => {
    if (data.length === 0) return

    // 計算異常點
    const avgRtts = data.filter(d => d.avgRtt !== null).map(d => d.avgRtt!)
    const meanRtt = avgRtts.reduce((a, b) => a + b, 0) / avgRtts.length
    const stdDev = Math.sqrt(
      avgRtts.map(x => Math.pow(x - meanRtt, 2)).reduce((a, b) => a + b, 0) / avgRtts.length
    )
    const spikeThreshold = meanRtt + stdDev * 2 // 2 標準差以上視為異常

    const points = data.map(d => ({
      timestamp: d.timestamp,
      hasAnomaly: d.packetLoss > 0 || (d.avgRtt !== null && d.avgRtt > spikeThreshold),
      packetLoss: d.packetLoss,
      rttSpike: d.avgRtt !== null && d.avgRtt > spikeThreshold,
      avgRtt: d.avgRtt,
    }))

    setTimelinePoints(points)
  }, [data])

  useEffect(() => {
    if (timelinePoints.length > 0 && canvasRef.current) {
      drawTimeline()
    }
  }, [timelinePoints, selectedTimestamp, hoveredIndex])

  const drawTimeline = () => {
    const canvas = canvasRef.current
    if (!canvas || timelinePoints.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { left: 60, right: 40, top: 10, bottom: 25 }
    const timelineWidth = width - padding.left - padding.right
    const timelineHeight = height - padding.top - padding.bottom
    const pointSpacing = timelineWidth / (timelinePoints.length - 1)

    // 清空
    ctx.clearRect(0, 0, width, height)

    // 背景 (透明，使用外層的背景色)
    ctx.clearRect(0, 0, width, height)

    // 時間軸線
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + timelineHeight / 2)
    ctx.lineTo(width - padding.right, padding.top + timelineHeight / 2)
    ctx.stroke()

    // 繪製點
    timelinePoints.forEach((point, index) => {
      const x = padding.left + pointSpacing * index
      const y = padding.top + timelineHeight / 2

      // 異常點放大並使用不同顏色
      if (point.hasAnomaly) {
        ctx.fillStyle = point.packetLoss > 0 ? '#ef4444' : '#f97316'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        // 異常標記（向上的線）
        ctx.strokeStyle = point.packetLoss > 0 ? '#ef4444' : '#f97316'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y - 4)
        ctx.lineTo(x, y - 15)
        ctx.stroke()
      } else {
        // 正常點
        ctx.fillStyle = '#94a3b8'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // 選中的點
      if (selectedTimestamp === point.timestamp) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 懸停的點
      if (hoveredIndex === index) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.stroke()

        // 顯示迷你提示
        const tooltipText = format(new Date(point.timestamp), 'HH:mm:ss')
        ctx.fillStyle = '#1f2937'
        ctx.font = '11px monospace'
        const textWidth = ctx.measureText(tooltipText).width
        ctx.fillRect(x - textWidth / 2 - 4, y - 30, textWidth + 8, 18)
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(tooltipText, x, y - 17)

        if (point.hasAnomaly) {
          const anomalyText = point.packetLoss > 0
            ? `Loss: ${point.packetLoss.toFixed(1)}%`
            : `Spike: ${point.avgRtt?.toFixed(1)}ms`
          ctx.fillStyle = '#1f2937'
          const anomalyWidth = ctx.measureText(anomalyText).width
          ctx.fillRect(x - anomalyWidth / 2 - 4, y + 18, anomalyWidth + 8, 16)
          ctx.fillStyle = '#ffffff'
          ctx.fillText(anomalyText, x, y + 29)
        }
      }
    })

    // 時間標籤（顯示 6 個時間點）
    ctx.fillStyle = '#6b7280'
    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    const timeLabels = 6
    for (let i = 0; i < timeLabels; i++) {
      const index = Math.floor((timelinePoints.length / (timeLabels - 1)) * i)
      if (index >= timelinePoints.length) continue
      const x = padding.left + pointSpacing * index
      const time = format(new Date(timelinePoints[index].timestamp), 'HH:mm')
      ctx.fillText(time, x, height - 5)
    }

    // 圖例
    ctx.textAlign = 'left'
    ctx.font = '10px monospace'
    const legendX = padding.left
    const legendY = padding.top + 2

    // 綠點 - 正常
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(legendX, legendY, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText('正常', legendX + 8, legendY + 4)

    // 紅點 - 掉包
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(legendX + 60, legendY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText('掉包', legendX + 68, legendY + 4)

    // 橘點 - 延遲突增
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.arc(legendX + 110, legendY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText('延遲突增', legendX + 118, legendY + 4)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || timelinePoints.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const timelineWidth = rect.width - padding - 40
    const pointSpacing = timelineWidth / (timelinePoints.length - 1)

    // 找到最近的點
    const index = Math.round((x - padding) / pointSpacing)

    if (index >= 0 && index < timelinePoints.length) {
      setHoveredIndex(index)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || timelinePoints.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const timelineWidth = rect.width - padding - 40
    const pointSpacing = timelineWidth / (timelinePoints.length - 1)

    const index = Math.round((x - padding) / pointSpacing)

    if (index >= 0 && index < timelinePoints.length) {
      onTimeSelect(timelinePoints[index].timestamp)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  if (timelinePoints.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
        時間軸 • 點擊選擇時間點
      </h4>
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer bg-slate-50 dark:bg-slate-900/30 rounded"
        style={{ height: '80px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  )
}
