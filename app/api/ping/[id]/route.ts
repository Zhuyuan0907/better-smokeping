import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MonitoringService } from '@/lib/monitoring'

// GET /api/ping/[id] - Get ping results for a target
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
    const limit = parseInt(searchParams.get('limit') || '1000')

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    const results = await prisma.pingResult.findMany({
      where: {
        targetId: id,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return NextResponse.json({ results, total: results.length })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch ping results', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/ping/[id] - Perform a ping test on a target
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 })
    }

    const target = await prisma.target.findUnique({
      where: { id },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Perform ping
    const result = await MonitoringService.ping(target.host)

    // Save result to database
    const pingResult = await prisma.pingResult.create({
      data: {
        targetId: id,
        minRtt: result.minRtt,
        avgRtt: result.avgRtt,
        maxRtt: result.maxRtt,
        packetLoss: result.packetLoss,
        packetsSent: result.packetsSent,
        packetsReceived: result.packetsReceived,
        jitter: result.jitter,
        isAlive: result.isAlive,
        timestamp: result.timestamp,
      },
    })

    return NextResponse.json(pingResult)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to perform ping', message: error.message },
      { status: 500 }
    )
  }
}
