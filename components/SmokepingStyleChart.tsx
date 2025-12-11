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

interface Target {
  id: number
  name: string
  host: string
  group?: string
}

interface TargetData {
  target: Target
  data: PingData[]
}

interface SmokepingStyleChartProps {
  targets: Target[]
  hours?: number
  selectedTimestamp?: string
  onTimeSelect?: (timestamp: string) => void
  onDataLoad?: (data: PingData[]) => void
  onZoomChange?: (timeRange: { start: string; end: string } | null) => void
}

// 為不同目標生成不同顏色
const TARGET_COLORS = [
  '#3b82f6', // 藍色
  '#ef4444', // 紅色
  '#10b981', // 綠色
  '#f59e0b', // 橘色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#f97316', // 橘紅色
]

export default function SmokepingStyleChart({
  targets,
  hours = 24,
  selectedTimestamp,
  onTimeSelect,
  onDataLoad,
  onZoomChange,
}: SmokepingStyleChartProps) {
  const [targetsData, setTargetsData] = useState<TargetData[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null)

  const isSingleTarget = targets.length === 1

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 60000)
    return () => clearInterval(interval)
  }, [targets, hours])

  useEffect(() => {
    if (targetsData.length > 0 && canvasRef.current) {
      drawChart()
    }
  }, [targetsData, hoveredIndex, selectedTimestamp, dragStart, dragEnd, zoomRange])

  const fetchAllData = async () => {
    try {
      // 只在初次載入時顯示 loading
      if (targetsData.length === 0) {
        setLoading(true)
      }

      const results = await Promise.all(
        targets.map(async (target) => {
          const res = await fetch(`/api/ping/${target.id}?hours=${hours}`)
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

            return {
              target,
              data: formatted,
            }
          }

          return {
            target,
            data: [],
          }
        })
      )

      setTargetsData(results)

      // 通知父組件數據已載入
      if (onDataLoad) {
        if (isSingleTarget && results[0]?.data) {
          // 單一目標：使用該目標的數據
          onDataLoad(results[0].data)
        } else if (results.length > 0) {
          // 多目標：使用第一個有數據的目標的數據作為時間軸參考
          const firstWithData = results.find(r => r.data.length > 0)
          if (firstWithData) {
            onDataLoad(firstWithData.data)
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('獲取數據失敗:', error)
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

  // 計算統計數據
  const stats = (() => {
    if (targetsData.length === 0 || targetsData.every(td => td.data.length === 0)) {
      return {
        median: 0,
        avg: 0,
        max: 0,
        min: 0,
        now: 0,
        sd: 0,
        avgLoss: 0,
        maxLoss: 0,
      }
    }

    // 對於單一目標，使用該目標的數據
    // 對於多目標，使用所有目標的合併數據
    let allRtts: number[] = []
    let allLosses: number[] = []
    let latestRtts: number[] = []

    targetsData.forEach(targetData => {
      const validRtts = targetData.data
        .filter(d => d.avgRtt !== null)
        .map(d => d.avgRtt as number)

      if (validRtts.length > 0) {
        allRtts.push(...validRtts)
        latestRtts.push(validRtts[validRtts.length - 1])
      }

      const losses = targetData.data.map(d => d.packetLoss)
      allLosses.push(...losses)
    })

    if (allRtts.length === 0) {
      return {
        median: 0,
        avg: 0,
        max: 0,
        min: 0,
        now: 0,
        sd: 0,
        avgLoss: 0,
        maxLoss: 0,
      }
    }

    const sortedRtts = [...allRtts].sort((a, b) => a - b)
    const median = sortedRtts[Math.floor(sortedRtts.length / 2)]
    const avg = allRtts.reduce((a, b) => a + b, 0) / allRtts.length
    const max = Math.max(...allRtts)
    const min = Math.min(...allRtts)
    const now = latestRtts.length > 0 ? latestRtts[latestRtts.length - 1] : 0
    const sd = calculateStdDev(allRtts)
    const avgLoss = allLosses.reduce((a, b) => a + b, 0) / allLosses.length
    const maxLoss = Math.max(...allLosses)

    return {
      median,
      avg,
      max,
      min,
      now,
      sd,
      avgLoss,
      maxLoss,
    }
  })()

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || targetsData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    // Adjust padding for legend when multiple targets
    const padding = {
      top: isSingleTarget ? 20 : 60, // More space for legend
      right: 40,
      bottom: 40,
      left: 60
    }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 清空畫布
    ctx.clearRect(0, 0, width, height)

    // 背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 根據縮放範圍篩選數據 - 對每個目標都要篩選
    const displayTargetsData = targetsData.map(targetData => ({
      target: targetData.target,
      data: zoomRange
        ? targetData.data.slice(zoomRange.start, zoomRange.end + 1)
        : targetData.data
    }))

    // 檢查是否有任何數據
    if (displayTargetsData.every(td => td.data.length === 0)) return

    // 找出所有目標中的最大 RTT 值
    let maxRtt = 0
    displayTargetsData.forEach(targetData => {
      const targetMax = Math.max(...targetData.data.map((d) => d.maxRtt || 0))
      if (targetMax > maxRtt) {
        maxRtt = targetMax
      }
    })

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

    // 繪製每個目標的數據
    displayTargetsData.forEach((targetData, targetIndex) => {
      const displayData = targetData.data
      if (displayData.length === 0) return

      // 單一目標：使用掉包率決定顏色
      // 多目標：使用固定的目標顏色
      let lineColor: string
      if (isSingleTarget) {
        const maxLossInDisplay = Math.max(...displayData.map(d => d.packetLoss))
        lineColor = getColorForLoss(maxLossInDisplay)
      } else {
        lineColor = TARGET_COLORS[targetIndex % TARGET_COLORS.length]
      }

      // 繪製數據線條
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 2
      ctx.beginPath()

      let pathStarted = false
      for (let i = 0; i < displayData.length; i++) {
        const d = displayData[i]
        if (d.avgRtt === null) continue

        const x = padding.left + (chartWidth / (displayData.length - 1)) * i
        const y = padding.top + chartHeight - d.avgRtt * yScale

        if (!pathStarted) {
          ctx.moveTo(x, y)
          pathStarted = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // 繪製掉包的垂直線（煙霧效果）
      for (let i = 0; i < displayData.length; i++) {
        const d = displayData[i]
        if (d.packetLoss > 0 && d.minRtt !== null && d.maxRtt !== null) {
          const x = padding.left + (chartWidth / (displayData.length - 1)) * i
          const yMin = padding.top + chartHeight - d.minRtt * yScale
          const yMax = padding.top + chartHeight - d.maxRtt * yScale

          ctx.strokeStyle = lineColor
          ctx.globalAlpha = 0.3
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x, yMin)
          ctx.lineTo(x, yMax)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    })

    // Y 軸標籤
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const value = (maxRtt * 1.1 / 5) * (5 - i)
      const y = padding.top + (chartHeight / 5) * i
      ctx.fillText(value.toFixed(0) + ' ms', padding.left - 10, y + 4)
    }

    // X 軸標籤（時間） - 使用第一個有數據的目標的時間軸
    const referenceData = displayTargetsData.find(td => td.data.length > 0)?.data || []
    if (referenceData.length > 0) {
      ctx.textAlign = 'center'
      const timeLabels = 6
      for (let i = 0; i < timeLabels; i++) {
        const index = Math.floor((referenceData.length / (timeLabels - 1)) * i)
        if (index >= referenceData.length) continue
        const x = padding.left + (chartWidth / (referenceData.length - 1)) * index
        const time = format(new Date(referenceData[index].timestamp), 'HH:mm')
        ctx.fillText(time, x, height - 10)
      }
    }

    // 繪製多目標圖例
    if (!isSingleTarget) {
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'

      const legendX = padding.left
      const legendY = 15
      const legendSpacing = 120 // 每個圖例項目的寬度

      targetsData.forEach((targetData, index) => {
        const color = TARGET_COLORS[index % TARGET_COLORS.length]
        const x = legendX + (index * legendSpacing)

        // 繪製顏色方塊
        ctx.fillStyle = color
        ctx.fillRect(x, legendY, 15, 10)

        // 繪製目標名稱
        ctx.fillStyle = '#1f2937'
        ctx.fillText(targetData.target.name, x + 20, legendY + 9)
      })
    }

    // 選中的時間點（從時間軸選擇）
    if (selectedTimestamp && !zoomRange && targetsData.length > 0) {
      const firstTargetData = targetsData[0].data
      const selectedIndex = firstTargetData.findIndex(d => d.timestamp === selectedTimestamp)
      if (selectedIndex !== -1) {
        const x = padding.left + (chartWidth / (firstTargetData.length - 1)) * selectedIndex

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
    if (hoveredIndex !== null) {
      const referenceData = displayTargetsData.find(td => td.data.length > 0)?.data || []
      if (referenceData[hoveredIndex]) {
        const x = padding.left + (chartWidth / (referenceData.length - 1)) * hoveredIndex

        // 繪製垂直線
        ctx.strokeStyle = '#94a3b8'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([])

        // 計算提示框內容和尺寸
        const timestamp = referenceData[hoveredIndex].timestamp
        let tooltipLines: string[] = [format(new Date(timestamp), 'HH:mm:ss')]

        // 收集所有目標在此時間點的數據
        displayTargetsData.forEach((targetData, targetIndex) => {
          const d = targetData.data[hoveredIndex]
          if (d && d.avgRtt !== null) {
            const targetName = targetData.target.name
            const rttText = `${targetName}: ${d.avgRtt.toFixed(1)} ms`
            tooltipLines.push(rttText)
            if (d.packetLoss > 0) {
              tooltipLines.push(`  Loss: ${d.packetLoss.toFixed(1)}%`)
            }
          }
        })

        // 繪製提示框
        const lineHeight = 14
        const tooltipPadding = 5
        const tooltipWidth = 180
        const tooltipHeight = tooltipLines.length * lineHeight + tooltipPadding * 2

        // 計算提示框位置（避免超出畫布）
        let tooltipX = x + 10
        let tooltipY = padding.top + 10

        if (tooltipX + tooltipWidth > width - padding.right) {
          tooltipX = x - tooltipWidth - 10
        }

        ctx.fillStyle = '#1f2937'
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)

        ctx.fillStyle = '#ffffff'
        ctx.font = '11px monospace'
        ctx.textAlign = 'left'

        tooltipLines.forEach((line, i) => {
          ctx.fillText(line, tooltipX + tooltipPadding, tooltipY + tooltipPadding + (i + 1) * lineHeight)
        })
      }
    }

    // 繪製拖拉選擇框
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const referenceData = displayTargetsData.find(td => td.data.length > 0)?.data || []
      if (referenceData.length > 0) {
        // 計算在當前顯示範圍內的位置
        const startOffset = zoomRange ? zoomRange.start : 0
        const relativeStart = dragStart - startOffset
        const relativeEnd = dragEnd - startOffset

        const x1 = padding.left + (chartWidth / (referenceData.length - 1)) * relativeStart
        const x2 = padding.left + (chartWidth / (referenceData.length - 1)) * relativeEnd
        const startX = Math.min(x1, x2)
        const endX = Math.max(x1, x2)

        // 半透明藍色選擇框
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
        ctx.fillRect(startX, padding.top, endX - startX, chartHeight)

        // 邊框
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.strokeRect(startX, padding.top, endX - startX, chartHeight)
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || targetsData.length === 0) return

    // 使用第一個有數據的目標作為參考
    const referenceData = targetsData.find(td => td.data.length > 0)?.data || []
    if (referenceData.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const chartWidth = rect.width - padding - 40

    // 根據當前是否縮放來計算索引
    const displayData = zoomRange ? referenceData.slice(zoomRange.start, zoomRange.end + 1) : referenceData
    const index = Math.round(((x - padding) / chartWidth) * (displayData.length - 1))

    if (index >= 0 && index < displayData.length) {
      setIsDragging(true)
      // 如果已經縮放，索引需要加上偏移
      const actualIndex = zoomRange ? zoomRange.start + index : index
      setDragStart(actualIndex)
      setDragEnd(actualIndex)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 使用第一個有數據的目標作為參考
    const referenceData = targetsData.find(td => td.data.length > 0)?.data || []
    const displayData = zoomRange ? referenceData.slice(zoomRange.start, zoomRange.end + 1) : referenceData
    if (displayData.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const chartWidth = rect.width - padding - 40

    const index = Math.round(((x - padding) / chartWidth) * (displayData.length - 1))

    if (index >= 0 && index < displayData.length) {
      if (isDragging) {
        // 正在拖拉，更新結束位置（需要考慮縮放偏移）
        const actualIndex = zoomRange ? zoomRange.start + index : index
        setDragEnd(actualIndex)
      } else {
        // 一般懸停
        setHoveredIndex(index)
        if (onTimeSelect) {
          onTimeSelect(displayData[index].timestamp)
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      // 拖拉結束，設定縮放範圍
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)

      // 只有拖拉範圍超過 5 個點才生效
      if (end - start > 5) {
        setZoomRange({ start, end })

        // 通知父組件縮放範圍已變更（傳遞時間戳）
        // 使用第一個有數據的目標作為參考
        const referenceData = targetsData.find(td => td.data.length > 0)?.data || []
        if (onZoomChange && referenceData[start] && referenceData[end]) {
          onZoomChange({
            start: referenceData[start].timestamp,
            end: referenceData[end].timestamp,
          })
        }
      }

      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
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
      {/* 統計資訊和操作按鈕 */}
      <div className="flex items-start justify-between">
        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1 flex-1">
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
        {isSingleTarget && (
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
        )}
        </div>

        {/* 重置縮放按鈕 */}
        {zoomRange && (
          <button
            onClick={() => {
              setZoomRange(null)
              if (onZoomChange) {
                onZoomChange(null)
              }
            }}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重置縮放
          </button>
        )}
      </div>

      {/* 圖表 */}
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: '400px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}

export { InteractiveTimeline }
