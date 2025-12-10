/**
 * Enhanced monitoring script with automatic MTR
 * Pings targets every 60 seconds, runs MTR every 5 minutes
 */

const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const PING_INTERVAL = parseInt(process.env.PING_INTERVAL || '60000') // 60 seconds
const PING_COUNT = parseInt(process.env.PING_COUNT || '30')
const MTR_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MTR_COUNT = 10

let mtrTimers = new Map()

async function ping(host, count = PING_COUNT) {
  const isMac = process.platform === 'darwin'
  const command = isMac
    ? `ping -c ${count} -W 2000 ${host}`
    : `ping -c ${count} -W 2 ${host}`

  try {
    const { stdout } = await execAsync(command, { timeout: (count + 5) * 1000 })
    const lines = stdout.split('\n')

    const statsLine = lines.find((line) => line.includes('packets transmitted'))
    const rttLine = lines.find((line) => line.includes('min/avg/max'))

    if (!statsLine) {
      throw new Error('Failed to parse ping output')
    }

    const packetMatch = statsLine.match(
      /(\d+) packets transmitted, (\d+).*received, ([\d.]+)% packet loss/
    )
    if (!packetMatch) {
      throw new Error('Failed to parse packet statistics')
    }

    const packetsSent = parseInt(packetMatch[1])
    const packetsReceived = parseInt(packetMatch[2])
    const packetLoss = parseFloat(packetMatch[3])

    let minRtt = null
    let avgRtt = null
    let maxRtt = null
    let jitter = null

    if (rttLine) {
      const rttMatch = isMac
        ? rttLine.match(/min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/)
        : rttLine.match(/min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/)

      if (rttMatch) {
        minRtt = parseFloat(rttMatch[1])
        avgRtt = parseFloat(rttMatch[2])
        maxRtt = parseFloat(rttMatch[3])
        jitter = parseFloat(rttMatch[4])
      }
    }

    return {
      minRtt,
      avgRtt,
      maxRtt,
      packetLoss,
      packetsSent,
      packetsReceived,
      jitter,
      isAlive: packetsReceived > 0,
    }
  } catch (error) {
    console.error(`Ping failed for ${host}:`, error.message)
    return {
      minRtt: null,
      avgRtt: null,
      maxRtt: null,
      packetLoss: 100,
      packetsSent: count,
      packetsReceived: 0,
      jitter: null,
      isAlive: false,
    }
  }
}

async function runMTR(target) {
  try {
    console.log(`執行 MTR: ${target.name} (${target.host})`)

    // 嘗試使用 mtr
    try {
      const { stdout } = await execAsync(`mtr -c ${MTR_COUNT} -n -b -j ${target.host}`, {
        timeout: 60000,
      })

      const mtrData = JSON.parse(stdout)
      const hops = mtrData.report.hubs.map((hub, index) => ({
        hop: index + 1,
        ip: hub.host,
        hostname: hub.host,
        avgRtt: hub.avg,
        loss: hub.loss,
        rtt1: hub.avg,
        rtt2: hub.avg,
        rtt3: hub.avg,
      }))

      await prisma.tracerouteResult.create({
        data: {
          targetId: target.id,
          hops: JSON.stringify(hops),
          destinationReached: true,
          totalHops: hops.length,
        },
      })

      console.log(`  ✓ MTR 完成: ${target.name} (${hops.length} 跳)`)
    } catch (mtrError) {
      // MTR 失敗，使用 traceroute
      const { stdout } = await execAsync(`traceroute -n -m 30 ${target.host}`, {
        timeout: 60000,
      })

      const lines = stdout.split('\n').slice(1)
      const hops = lines
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.trim().split(/\s+/)
          const hop = parseInt(parts[0])
          const ip = parts[1] !== '*' ? parts[1] : '???'
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

      await prisma.tracerouteResult.create({
        data: {
          targetId: target.id,
          hops: JSON.stringify(hops),
          destinationReached: hops.length > 0,
          totalHops: hops.length,
        },
      })

      console.log(`  ✓ Traceroute 完成: ${target.name} (${hops.length} 跳)`)
    }
  } catch (error) {
    console.error(`  ✗ MTR 失敗: ${target.name}`, error.message)
  }
}

async function monitorTargets() {
  try {
    const targets = await prisma.target.findMany({
      where: { enabled: true },
    })

    if (targets.length === 0) {
      console.log('沒有啟用的監測目標')
      return
    }

    console.log(`監測 ${targets.length} 個目標...`)

    for (const target of targets) {
      console.log(`Pinging ${target.name} (${target.host})...`)

      const result = await ping(target.host, PING_COUNT)

      await prisma.pingResult.create({
        data: {
          targetId: target.id,
          minRtt: result.minRtt,
          avgRtt: result.avgRtt,
          maxRtt: result.maxRtt,
          packetLoss: result.packetLoss,
          packetsSent: result.packetsSent,
          packetsReceived: result.packetsReceived,
          jitter: result.jitter,
          isAlive: result.isAlive,
        },
      })

      if (result.isAlive) {
        console.log(
          `  ✓ ${target.name}: RTT=${result.avgRtt?.toFixed(2)}ms, Loss=${result.packetLoss}%`
        )
      } else {
        console.log(`  ✗ ${target.name}: RTT=N/A, Loss=${result.packetLoss}%`)
      }

      // 設置 MTR 定時器（如果還沒有）
      if (!mtrTimers.has(target.id)) {
        // 立即執行一次
        runMTR(target)

        // 設置定時器每 5 分鐘執行一次
        const timer = setInterval(() => {
          runMTR(target)
        }, MTR_INTERVAL)

        mtrTimers.set(target.id, timer)
      }
    }

    console.log(`完成監測週期: ${new Date().toISOString()}\n`)
  } catch (error) {
    console.error('監測週期錯誤:', error)
  }
}

async function main() {
  console.log('啟動 Better Smokeping 監測服務...')
  console.log(`Ping 間隔: ${PING_INTERVAL}ms`)
  console.log(`Ping 次數: ${PING_COUNT}`)
  console.log(`MTR 間隔: ${MTR_INTERVAL / 1000 / 60} 分鐘`)

  // 立即執行一次
  await monitorTargets()

  // 設置定時器
  setInterval(monitorTargets, PING_INTERVAL)

  console.log('監測服務運行中...')
}

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信號，正在關閉...')
  mtrTimers.forEach((timer) => clearInterval(timer))
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信號，正在關閉...')
  mtrTimers.forEach((timer) => clearInterval(timer))
  await prisma.$disconnect()
  process.exit(0)
})

main().catch(console.error)
