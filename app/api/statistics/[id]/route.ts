import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/statistics/[id] - Get statistics for a target
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')

    const target = await prisma.target.findUnique({
      where: { id },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get aggregated statistics
    const results = await prisma.pingResult.findMany({
      where: {
        targetId: id,
        timestamp: {
          gte: startTime,
        },
      },
    })

    if (results.length === 0) {
      return NextResponse.json({
        targetId: id,
        targetName: target.name,
        targetHost: target.host,
        avgRtt: null,
        minRtt: null,
        maxRtt: null,
        avgPacketLoss: null,
        uptimePercentage: null,
        totalChecks: 0,
        lastCheck: null,
      })
    }

    const avgRtt = results.reduce((sum, r) => sum + (r.avgRtt || 0), 0) / results.length
    const minRtt = Math.min(...results.map(r => r.minRtt || Infinity))
    const maxRtt = Math.max(...results.map(r => r.maxRtt || 0))
    const avgPacketLoss = results.reduce((sum, r) => sum + (r.packetLoss || 0), 0) / results.length
    const aliveChecks = results.filter(r => r.isAlive).length
    const uptimePercentage = (aliveChecks / results.length) * 100
    const lastCheck = results[0]?.timestamp

    return NextResponse.json({
      targetId: id,
      targetName: target.name,
      targetHost: target.host,
      avgRtt: Number.isFinite(avgRtt) ? avgRtt : null,
      minRtt: Number.isFinite(minRtt) ? minRtt : null,
      maxRtt: Number.isFinite(maxRtt) ? maxRtt : null,
      avgPacketLoss,
      uptimePercentage,
      totalChecks: results.length,
      lastCheck,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    )
  }
}
