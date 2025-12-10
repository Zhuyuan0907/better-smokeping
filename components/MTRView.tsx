'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Network, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Hop {
  hop: number
  ip: string
  hostname?: string
  rtt1?: number
  rtt2?: number
  rtt3?: number
  avgRtt?: number
  loss?: number
}

interface MTRResult {
  id: number
  timestamp: string
  hops: Hop[]
  destinationReached: boolean
  totalHops: number
}

interface MTRViewProps {
  targetId: number
  targetName: string
  targetHost: string
}

export default function MTRView({ targetId, targetName, targetHost }: MTRViewProps) {
  const [mtrData, setMtrData] = useState<MTRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runMTR = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/mtr/${targetId}`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('MTR 執行失敗')
      }

      const data = await res.json()
      setMtrData(data)
    } catch (err: any) {
      setError(err.message || '執行 MTR 時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestMTR = async () => {
    try {
      const res = await fetch(`/api/mtr/${targetId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.result) {
          setMtrData(data.result)
        }
      }
    } catch (err) {
      console.error('獲取 MTR 數據失敗:', err)
    }
  }

  useEffect(() => {
    fetchLatestMTR()
  }, [targetId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              MTR 路由追蹤
            </CardTitle>
            <CardDescription>
              {targetName} ({targetHost})
            </CardDescription>
          </div>
          <Button onClick={runMTR} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '執行中...' : '執行 MTR'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && !mtrData && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>點擊「執行 MTR」開始路由追蹤</p>
          </div>
        )}

        {!loading && mtrData && (
          <div className="space-y-4">
            {/* MTR 結果資訊 */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
              <span>
                執行時間:{' '}
                {format(new Date(mtrData.timestamp), 'yyyy/MM/dd HH:mm:ss')}
              </span>
              <span>
                目的地{mtrData.destinationReached ? '已' : '未'}到達 • 共 {mtrData.totalHops} 跳
              </span>
            </div>

            {/* 跳轉列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">主機</th>
                    <th className="text-right py-2 px-3">IP 地址</th>
                    <th className="text-right py-2 px-3">RTT1</th>
                    <th className="text-right py-2 px-3">RTT2</th>
                    <th className="text-right py-2 px-3">RTT3</th>
                    <th className="text-right py-2 px-3">平均</th>
                    <th className="text-right py-2 px-3">遺失</th>
                  </tr>
                </thead>
                <tbody>
                  {mtrData.hops.map((hop, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-2 px-3 font-mono">{hop.hop}</td>
                      <td className="py-2 px-3 max-w-xs truncate" title={hop.hostname}>
                        {hop.hostname || '???'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs">{hop.ip}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {hop.rtt1 !== undefined ? `${hop.rtt1.toFixed(2)}ms` : '---'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {hop.rtt2 !== undefined ? `${hop.rtt2.toFixed(2)}ms` : '---'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {hop.rtt3 !== undefined ? `${hop.rtt3.toFixed(2)}ms` : '---'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {hop.avgRtt !== undefined ? `${hop.avgRtt.toFixed(2)}ms` : '---'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {hop.loss !== undefined ? (
                          <span
                            className={
                              hop.loss > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''
                            }
                          >
                            {hop.loss.toFixed(0)}%
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 路由可視化 */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-3">路由路徑</h4>
              <div className="space-y-2">
                {mtrData.hops.map((hop, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div className="w-8 text-right text-muted-foreground">{hop.hop}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div
                        className={`flex-1 p-2 rounded ${
                          hop.loss && hop.loss > 0
                            ? 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                            : 'bg-white dark:bg-slate-900 border'
                        }`}
                      >
                        <div className="font-mono">{hop.ip}</div>
                        {hop.hostname && hop.hostname !== hop.ip && (
                          <div className="text-muted-foreground truncate">{hop.hostname}</div>
                        )}
                      </div>
                      <div className="w-20 text-right font-mono">
                        {hop.avgRtt !== undefined ? `${hop.avgRtt.toFixed(1)}ms` : '---'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
