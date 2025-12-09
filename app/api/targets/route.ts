import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/targets - Get all targets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')

    const targets = await prisma.target.findMany({
      where: group ? { group } : undefined,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ targets, total: targets.length })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch targets', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/targets - Create a new target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, host, description, group, enabled } = body

    if (!name || !host) {
      return NextResponse.json(
        { error: 'Name and host are required' },
        { status: 400 }
      )
    }

    const target = await prisma.target.create({
      data: {
        name,
        host,
        description,
        group: group || 'default',
        enabled: enabled !== undefined ? enabled : true,
      },
    })

    return NextResponse.json(target, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Target with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create target', message: error.message },
      { status: 500 }
    )
  }
}
