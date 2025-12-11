import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// GET: 獲取 MTR 歷史記錄
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const targetId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const results = await prisma.tracerouteResult.findMany({
      where: { targetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    if (results.length === 0) {
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        hops: JSON.parse(r.hops),
        destinationReached: r.destinationReached,
        totalHops: r.totalHops,
      })),
    })
  } catch (error: any) {
    console.error('獲取 MTR 結果失敗:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 執行 MTR
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const targetId = parseInt(params.id)

    // 獲取目標資訊
    const target = await prisma.target.findUnique({
      where: { id: targetId },
    })

    if (!target) {
      return NextResponse.json({ error: '目標不存在' }, { status: 404 })
    }

    // 執行 MTR
    console.log(`執行 MTR 到 ${target.host}...`)

    try {
      // 使用 mtr 命令（JSON 格式輸出）
      const { stdout } = await execAsync(
        `mtr -c 10 -n -b -j ${target.host}`,
        { timeout: 60000 } // 60 秒超時
      )

      const mtrData = JSON.parse(stdout)
      // 注意：MTR JSON 輸出使用大寫欄位名稱: Loss%, Snt, Last, Avg, Best, Wrst, StDev
      const hops = mtrData.report.hubs.map((hub: any, index: number) => ({
        hop: index + 1,
        ip: hub.host,
        hostname: hub.host,
        loss: hub['Loss%'] || 0,
        sent: hub.Snt || hub.count || 10,
        last: hub.Last || hub.Avg || 0,
        avgRtt: hub.Avg || 0,
        minRtt: hub.Best || hub.Avg || 0,
        maxRtt: hub.Wrst || hub.Avg || 0,
        stdDev: hub.StDev || 0,
      }))

      // 保存到數據庫
      const result = await prisma.tracerouteResult.create({
        data: {
          targetId,
          hops: JSON.stringify(hops),
          destinationReached: true,
          totalHops: hops.length,
        },
      })

      return NextResponse.json({
        id: result.id,
        timestamp: result.timestamp,
        hops,
        destinationReached: true,
        totalHops: hops.length,
      })
    } catch (execError: any) {
      // MTR 失敗，嘗試使用 traceroute
      console.log('MTR 失敗，使用 traceroute...')

      try {
        const { stdout: traceoutput } = await execAsync(`traceroute -n -m 30 ${target.host}`, {
          timeout: 60000,
        })

        const lines = traceoutput.split('\n').slice(1) // 跳過標題行
        const hops = lines
          .filter((line) => line.trim())
          .map((line, index) => {
            const parts = line.trim().split(/\s+/)
            const hop = parseInt(parts[0])
            const ip = parts[1] !== '*' ? parts[1] : '???'

            // 解析 RTT 值
            const rtts = parts.slice(2).filter((p) => p.endsWith('ms')).map((p) => parseFloat(p))

            return {
              hop,
              ip,
              hostname: ip,
              rtt1: rtts[0],
              rtt2: rtts[1],
              rtt3: rtts[2],
              avgRtt: rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : undefined,
              loss: 0,
            }
          })

        const result = await prisma.tracerouteResult.create({
          data: {
            targetId,
            hops: JSON.stringify(hops),
            destinationReached: hops.length > 0,
            totalHops: hops.length,
          },
        })

        return NextResponse.json({
          id: result.id,
          timestamp: result.timestamp,
          hops,
          destinationReached: hops.length > 0,
          totalHops: hops.length,
        })
      } catch (traceError) {
        throw new Error('MTR 和 traceroute 都執行失敗')
      }
    }
  } catch (error: any) {
    console.error('執行 MTR 失敗:', error)
    return NextResponse.json({ error: error.message || '執行 MTR 失敗' }, { status: 500 })
  }
}
