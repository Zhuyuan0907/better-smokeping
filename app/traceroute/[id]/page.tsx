'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function TraceroutePage() {
  const params = useParams()
  const router = useRouter()
  const targetId = params.id as string

  const [target, setTarget] = useState<any>(null)
  const [traceroute, setTraceroute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchTarget()
    fetchLatestTraceroute()
  }, [targetId])

  const fetchTarget = async () => {
    try {
      const res = await fetch(`/api/targets/${targetId}`)
      const data = await res.json()
      setTarget(data)
    } catch (error) {
      console.error('Failed to fetch target:', error)
    }
  }

  const fetchLatestTraceroute = async () => {
    try {
      const res = await fetch(`/api/traceroute/${targetId}?limit=1`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        setTraceroute(data.results[0])
      }
    } catch (error) {
      console.error('Failed to fetch traceroute:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTraceroute = async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/traceroute/${targetId}`, {
        method: 'POST',
      })
      const data = await res.json()
      setTraceroute(data)
    } catch (error) {
      console.error('Failed to run traceroute:', error)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Traceroute</h1>
              {target && (
                <p className="text-muted-foreground mt-1">
                  {target.name} ({target.host})
                </p>
              )}
            </div>
            <Button onClick={runTraceroute} disabled={running}>
              <Play className="h-4 w-4 mr-2" />
              {running ? 'Running...' : 'Run Traceroute'}
            </Button>
          </div>
        </div>

        {/* Results */}
        {traceroute ? (
          <div className="space-y-4">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Route Information</span>
                  <span className={`text-sm font-normal ${
                    traceroute.destinationReached ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {traceroute.destinationReached ? 'Destination Reached' : 'Incomplete Route'}
                  </span>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(traceroute.timestamp), 'PPpp')}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {traceroute.totalHops} hops
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Hops */}
            <Card>
              <CardHeader>
                <CardTitle>Route Path</CardTitle>
                <CardDescription>
                  Network path from source to destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {traceroute.hops.map((hop: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {/* Hop Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {hop.hop}
                      </div>

                      {/* Hop Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {hop.hostname && (
                              <div className="font-medium truncate">
                                {hop.hostname}
                              </div>
                            )}
                            {hop.ip ? (
                              <div className="text-sm text-muted-foreground font-mono">
                                {hop.ip}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                * * * (No response)
                              </div>
                            )}
                          </div>

                          {/* RTT */}
                          {hop.avgRtt && (
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-medium">
                                {hop.avgRtt.toFixed(2)} ms
                              </div>
                              {hop.rtt.length > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  {hop.rtt.map((r: number) => r.toFixed(1)).join(', ')} ms
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Traceroute Data</h3>
              <p className="text-muted-foreground mb-6">
                Run a traceroute to see the network path
              </p>
              <Button onClick={runTraceroute} disabled={running}>
                <Play className="h-4 w-4 mr-2" />
                {running ? 'Running...' : 'Run Traceroute'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
