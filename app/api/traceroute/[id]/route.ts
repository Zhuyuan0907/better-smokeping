import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MonitoringService } from '@/lib/monitoring'

// GET /api/traceroute/[id] - Get traceroute results for a target
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
    const limit = parseInt(searchParams.get('limit') || '10')

    const results = await prisma.tracerouteResult.findMany({
      where: {
        targetId: id,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Parse JSON hops
    const parsedResults = results.map(result => ({
      ...result,
      hops: JSON.parse(result.hops),
    }))

    return NextResponse.json({ results: parsedResults, total: results.length })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch traceroute results', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/traceroute/[id] - Perform a traceroute on a target
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

    // Perform traceroute
    const result = await MonitoringService.traceroute(target.host)

    // Save result to database
    const tracerouteResult = await prisma.tracerouteResult.create({
      data: {
        targetId: id,
        hops: JSON.stringify(result.hops),
        destinationReached: result.destinationReached,
        totalHops: result.totalHops,
        timestamp: result.timestamp,
      },
    })

    return NextResponse.json({
      ...tracerouteResult,
      hops: result.hops,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to perform traceroute', message: error.message },
      { status: 500 }
    )
  }
}
