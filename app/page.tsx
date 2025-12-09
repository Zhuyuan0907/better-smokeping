'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Plus, RefreshCw } from 'lucide-react'
import TargetSidebar from '@/components/TargetSidebar'
import LatencyChart from '@/components/LatencyChart'
import StatsCards from '@/components/StatsCards'
import AddTargetDialog from '@/components/AddTargetDialog'

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<string>('24')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    fetchTargets()
  }, [])

  useEffect(() => {
    if (selectedTarget) {
      // Auto refresh every 60 seconds
      const interval = setInterval(() => {
        fetchTargets()
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [selectedTarget])

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets')
      const data = await res.json()
      setTargets(data.targets || [])

      if (!selectedTarget && data.targets.length > 0) {
        setSelectedTarget(data.targets[0])
      }
    } catch (error) {
      console.error('Failed to fetch targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTarget = async (targetData: any) => {
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetData),
      })

      if (res.ok) {
        await fetchTargets()
        setShowAddDialog(false)
      }
    } catch (error) {
      console.error('Failed to add target:', error)
    }
  }

  const handleRunPing = async () => {
    if (!selectedTarget) return

    try {
      await fetch(`/api/ping/${selectedTarget.id}`, {
        method: 'POST',
      })
      // Refresh data after ping
      setTimeout(fetchTargets, 2000)
    } catch (error) {
      console.error('Failed to run ping:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Sidebar */}
      <TargetSidebar
        targets={targets}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
        onAddTarget={() => setShowAddDialog(true)}
        onRefresh={fetchTargets}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Network Monitoring</h1>
              <p className="text-muted-foreground mt-1">
                Real-time latency and network performance tracking
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 Hour</SelectItem>
                  <SelectItem value="6">Last 6 Hours</SelectItem>
                  <SelectItem value="24">Last 24 Hours</SelectItem>
                  <SelectItem value="168">Last 7 Days</SelectItem>
                  <SelectItem value="720">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRunPing} disabled={!selectedTarget}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Ping Now
              </Button>
            </div>
          </div>

          {selectedTarget ? (
            <>
              {/* Stats Cards */}
              <StatsCards targetId={selectedTarget.id} hours={parseInt(timeRange)} />

              {/* Main Chart */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    {selectedTarget.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedTarget.host} • {selectedTarget.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LatencyChart targetId={selectedTarget.id} hours={parseInt(timeRange)} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Target Selected</h3>
                <p className="text-muted-foreground mb-6">
                  Add a monitoring target to get started
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Target Dialog */}
      <AddTargetDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddTarget}
      />
    </div>
  )
}
