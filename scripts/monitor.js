/**
 * Continuous monitoring script
 * This script runs continuously and pings all enabled targets at regular intervals
 */

const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const PING_INTERVAL = parseInt(process.env.PING_INTERVAL || '60000') // 60 seconds
const PING_COUNT = parseInt(process.env.PING_COUNT || '10')

async function ping(host, count = PING_COUNT) {
  const isMac = process.platform === 'darwin'
  const command = isMac
    ? `ping -c ${count} -W 2000 ${host}`
    : `ping -c ${count} -W 2 ${host}`

  try {
    const { stdout } = await execAsync(command, { timeout: (count + 5) * 1000 })
    const lines = stdout.split('\n')

    const statsLine = lines.find(line => line.includes('packets transmitted'))
    const rttLine = lines.find(line => line.includes('min/avg/max'))

    if (!statsLine) {
      throw new Error('Failed to parse ping output')
    }

    const packetMatch = statsLine.match(/(\d+) packets transmitted, (\d+).*received, ([\d.]+)% packet loss/)
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
      isAlive: packetsReceived > 0,
      minRtt,
      avgRtt,
      maxRtt,
      packetLoss,
      packetsSent,
      packetsReceived,
      jitter,
    }
  } catch (error) {
    return {
      isAlive: false,
      minRtt: null,
      avgRtt: null,
      maxRtt: null,
      packetLoss: 100,
      packetsSent: count,
      packetsReceived: 0,
      jitter: null,
    }
  }
}

async function monitorTargets() {
  try {
    // Get all enabled targets
    const targets = await prisma.target.findMany({
      where: { enabled: true },
    })

    if (targets.length === 0) {
      console.log('No enabled targets found')
      return
    }

    console.log(`Monitoring ${targets.length} targets...`)

    // Ping all targets
    const results = await Promise.all(
      targets.map(async (target) => {
        console.log(`Pinging ${target.name} (${target.host})...`)
        const result = await ping(target.host)

        // Save result to database
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

        const status = result.isAlive ? '✓' : '✗'
        const rtt = result.avgRtt ? `${result.avgRtt.toFixed(2)}ms` : 'N/A'
        const loss = `${result.packetLoss.toFixed(1)}%`

        console.log(`  ${status} ${target.name}: RTT=${rtt}, Loss=${loss}`)

        return result
      })
    )

    console.log(`Completed monitoring cycle at ${new Date().toISOString()}`)
  } catch (error) {
    console.error('Error in monitoring cycle:', error)
  }
}

async function cleanup() {
  try {
    // Delete ping results older than 30 days
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const deleted = await prisma.pingResult.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    })

    if (deleted.count > 0) {
      console.log(`Cleaned up ${deleted.count} old ping results`)
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

async function main() {
  console.log('Starting Better Smokeping Monitor...')
  console.log(`Ping interval: ${PING_INTERVAL}ms`)
  console.log(`Ping count: ${PING_COUNT}`)

  // Run initial monitoring
  await monitorTargets()

  // Schedule monitoring
  setInterval(monitorTargets, PING_INTERVAL)

  // Run cleanup daily
  setInterval(cleanup, 24 * 60 * 60 * 1000)
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down monitor...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nShutting down monitor...')
  await prisma.$disconnect()
  process.exit(0)
})

main().catch(async (error) => {
  console.error('Fatal error:', error)
  await prisma.$disconnect()
  process.exit(1)
})
