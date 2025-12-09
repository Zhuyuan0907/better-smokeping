'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, TrendingDown, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { formatLatency, formatPacketLoss, formatUptime } from '@/lib/utils'

interface StatsCardsProps {
  targetId: number
  hours: number
}

export default function StatsCards({ targetId, hours }: StatsCardsProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [targetId, hours])

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/statistics/${targetId}?hours=${hours}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-slate-200 rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const isHealthy = stats.uptimePercentage > 95 && (stats.avgPacketLoss || 0) < 5

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Avg Latency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatLatency(stats.avgRtt)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Min: {formatLatency(stats.minRtt)} / Max: {formatLatency(stats.maxRtt)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Packet Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            (stats.avgPacketLoss || 0) > 5 ? 'text-red-500' : 'text-green-500'
          }`}>
            {formatPacketLoss(stats.avgPacketLoss)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Over {stats.totalChecks} checks
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {isHealthy ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            (stats.uptimePercentage || 0) > 95 ? 'text-green-500' : 'text-yellow-500'
          }`}>
            {formatUptime(stats.uptimePercentage)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last {hours}h
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isHealthy ? 'text-green-500' : 'text-yellow-500'}`}>
            {isHealthy ? 'Healthy' : 'Warning'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalChecks} total checks
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
