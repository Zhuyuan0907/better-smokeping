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
  timeRange?: { start: string; end: string } | null
  fullTimeRange?: number // 完整時間範圍（小時數），用於顯示完整時間軸
}

export default function InteractiveTimeline({
  data,
  selectedTimestamp,
  onTimeSelect,
  timeRange,
  fullTimeRange,
}: InteractiveTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([])

  useEffect(() => {
    // 確定時間範圍
    let startTime: number
    let endTime: number

    if (timeRange) {
      // 如果有縮放範圍，使用縮放範圍
      startTime = new Date(timeRange.start).getTime()
      endTime = new Date(timeRange.end).getTime()
    } else if (data.length > 0) {
      // 如果有數據但沒有縮放，使用數據的時間範圍
      startTime = new Date(data[0].timestamp).getTime()
      endTime = new Date(data[data.length - 1].timestamp).getTime()
    } else if (fullTimeRange) {
      // 如果沒有數據但有 fullTimeRange，生成完整時間範圍
      endTime = Date.now()
      startTime = endTime - (fullTimeRange * 60 * 60 * 1000)
    } else {
      // 沒有任何數據和配置，不顯示
      setTimelinePoints([])
      return
    }

    // 根據時間範圍過濾數據
    const displayData = data.filter(d => {
      const time = new Date(d.timestamp).getTime()
      return time >= startTime && time <= endTime
    })

    // 即使沒有數據，也要生成時間點（用於顯示完整時間軸）
    if (displayData.length === 0 && fullTimeRange) {
      // 生成空的時間點，僅用於時間標籤顯示
      setTimelinePoints([])
      return
    }

    if (displayData.length === 0) {
      setTimelinePoints([])
      return
    }

    // 計算異常點 - 使用改進的 IQR + 相對變化算法
    const avgRtts = displayData.filter(d => d.avgRtt !== null).map(d => d.avgRtt!)
    if (avgRtts.length === 0) {
      // 所有數據都是 null，創建基本點
      const points = displayData.map(d => ({
        timestamp: d.timestamp,
        hasAnomaly: d.packetLoss > 0,
        packetLoss: d.packetLoss,
        rttSpike: false,
        avgRtt: d.avgRtt,
      }))
      setTimelinePoints(points)
      return
    }

    // 使用 IQR 方法計算異常閾值
    const sortedRtts = [...avgRtts].sort((a, b) => a - b)
    const q1Index = Math.floor(sortedRtts.length * 0.25)
    const q3Index = Math.floor(sortedRtts.length * 0.75)
    const q1 = sortedRtts[q1Index]
    const q3 = sortedRtts[q3Index]
    const iqr = q3 - q1

    // 計算中位數作為基線
    const medianIndex = Math.floor(sortedRtts.length * 0.5)
    const median = sortedRtts[medianIndex]

    // 異常閾值：使用 IQR 方法，但也考慮相對變化
    // 1. IQR 上限：Q3 + 1.5 * IQR
    // 2. 相對變化：超過中位數的 50% 以上
    // 3. 絕對最小閾值：至少比中位數高 5ms
    const iqrUpperBound = q3 + 1.5 * iqr
    const relativeThreshold = median * 1.5 // 超過中位數 50%
    const absoluteMinThreshold = median + 5 // 至少高 5ms

    // 取這三個閾值中最合理的
    const spikeThreshold = Math.max(
      Math.min(iqrUpperBound, relativeThreshold), // 取 IQR 和相對變化的較小值
      absoluteMinThreshold // 但至少要高於絕對最小閾值
    )

    // 計算移動平均，用於檢測短期突增
    const windowSize = Math.min(5, Math.floor(displayData.length / 10) || 1)

    const points = displayData.map((d, index) => {
      // 檢查掉包
      if (d.packetLoss > 0) {
        return {
          timestamp: d.timestamp,
          hasAnomaly: true,
          packetLoss: d.packetLoss,
          rttSpike: false,
          avgRtt: d.avgRtt,
        }
      }

      if (d.avgRtt === null) {
        return {
          timestamp: d.timestamp,
          hasAnomaly: false,
          packetLoss: d.packetLoss,
          rttSpike: false,
          avgRtt: d.avgRtt,
        }
      }

      // 檢查是否超過全局閾值
      const exceedsGlobalThreshold = d.avgRtt > spikeThreshold

      // 檢查是否相對於近期平均有突增（短期突增檢測）
      let exceedsLocalThreshold = false
      if (index >= windowSize) {
        const recentRtts = displayData
          .slice(index - windowSize, index)
          .filter(x => x.avgRtt !== null)
          .map(x => x.avgRtt!)

        if (recentRtts.length > 0) {
          const localAvg = recentRtts.reduce((a, b) => a + b, 0) / recentRtts.length
          // 比近期平均高 100% 或高 10ms 以上視為短期突增
          exceedsLocalThreshold = d.avgRtt > localAvg * 2 || d.avgRtt > localAvg + 10
        }
      }

      const isSpike = exceedsGlobalThreshold || exceedsLocalThreshold

      return {
        timestamp: d.timestamp,
        hasAnomaly: isSpike,
        packetLoss: d.packetLoss,
        rttSpike: isSpike,
        avgRtt: d.avgRtt,
      }
    })

    setTimelinePoints(points)
  }, [data, timeRange, fullTimeRange])

  useEffect(() => {
    if (canvasRef.current) {
      drawTimeline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelinePoints, selectedTimestamp, hoveredIndex])

  const drawTimeline = () => {
    const canvas = canvasRef.current
    if (!canvas) return

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

    // 清空
    ctx.clearRect(0, 0, width, height)

    // 時間軸線（始終顯示）
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + timelineHeight / 2)
    ctx.lineTo(width - padding.right, padding.top + timelineHeight / 2)
    ctx.stroke()

    // 如果沒有數據點，只顯示時間標籤
    if (timelinePoints.length === 0) {
      // 確定時間範圍用於時間標籤
      let startTime: number
      let endTime: number

      if (timeRange) {
        startTime = new Date(timeRange.start).getTime()
        endTime = new Date(timeRange.end).getTime()
      } else if (data.length > 0) {
        startTime = new Date(data[0].timestamp).getTime()
        endTime = new Date(data[data.length - 1].timestamp).getTime()
      } else if (fullTimeRange) {
        endTime = Date.now()
        startTime = endTime - (fullTimeRange * 60 * 60 * 1000)
      } else {
        return
      }

      // 繪製時間標籤（6 個時間點）
      ctx.fillStyle = '#6b7280'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      const timeLabels = 6
      for (let i = 0; i < timeLabels; i++) {
        const ratio = i / (timeLabels - 1)
        const timestamp = startTime + (endTime - startTime) * ratio
        const x = padding.left + timelineWidth * ratio
        const time = format(new Date(timestamp), 'HH:mm')
        ctx.fillText(time, x, height - 5)
      }

      // 繪製圖例
      ctx.textAlign = 'left'
      ctx.font = '10px monospace'
      const legendX = padding.left
      const legendY = padding.top + 2

      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.arc(legendX, legendY, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText('無數據', legendX + 8, legendY + 4)

      return
    }

    const pointSpacing = timelineWidth / (timelinePoints.length - 1)

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

  // 即使沒有數據點，也要顯示時間軸（如果有 fullTimeRange）
  const shouldShow = timelinePoints.length > 0 || fullTimeRange || data.length > 0

  if (!shouldShow) {
    return null
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
        時間軸{timelinePoints.length > 0 ? ' • 點擊選擇時間點' : ' • 無數據'}
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
