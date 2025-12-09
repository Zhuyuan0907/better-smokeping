import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/targets/[id] - Get a specific target
export async function GET(
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

    return NextResponse.json(target)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch target', message: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/targets/[id] - Update a target
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, host, description, group, enabled } = body

    const target = await prisma.target.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(host && { host }),
        ...(description !== undefined && { description }),
        ...(group && { group }),
        ...(enabled !== undefined && { enabled }),
      },
    })

    return NextResponse.json(target)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to update target', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/targets/[id] - Delete a target
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 })
    }

    await prisma.target.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Target deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete target', message: error.message },
      { status: 500 }
    )
  }
}
