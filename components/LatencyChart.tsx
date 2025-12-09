'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import { format } from 'date-fns'

interface LatencyChartProps {
  targetId: number
  hours: number
}

export default function LatencyChart({ targetId, hours }: LatencyChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [targetId, hours])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/ping/${targetId}?hours=${hours}&limit=500`)
      const json = await res.json()

      // Transform data for chart
      const chartData = (json.results || [])
        .reverse()
        .map((result: any) => ({
          timestamp: new Date(result.timestamp).getTime(),
          time: format(new Date(result.timestamp), 'HH:mm'),
          avgRtt: result.avgRtt,
          minRtt: result.minRtt,
          maxRtt: result.maxRtt,
          packetLoss: result.packetLoss,
          isAlive: result.isAlive,
        }))

      setData(chartData)
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run a ping test to see results
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Latency Chart */}
      <div>
        <h3 className="text-sm font-medium mb-4">Latency (RTT)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              formatter={(value: any) => [`${value?.toFixed(2)} ms`, '']}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="maxRtt"
              fill="#3b82f6"
              stroke="none"
              fillOpacity={0.1}
              name="Max RTT Range"
            />
            <Line
              type="monotone"
              dataKey="avgRtt"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Average RTT"
            />
            <Line
              type="monotone"
              dataKey="minRtt"
              stroke="#10b981"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              name="Min RTT"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Packet Loss Chart */}
      <div>
        <h3 className="text-sm font-medium mb-4">Packet Loss</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              label={{ value: '%', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              formatter={(value: any) => [`${value?.toFixed(1)}%`, 'Packet Loss']}
            />
            <Line
              type="stepAfter"
              dataKey="packetLoss"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Packet Loss"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
