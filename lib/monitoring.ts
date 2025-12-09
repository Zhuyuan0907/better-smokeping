import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface PingResult {
  host: string
  isAlive: boolean
  minRtt: number | null
  avgRtt: number | null
  maxRtt: number | null
  packetLoss: number | null
  packetsSent: number
  packetsReceived: number
  jitter: number | null
  timestamp: Date
  error?: string
}

export interface TracerouteHop {
  hop: number
  ip: string | null
  hostname: string | null
  rtt: number[]
  avgRtt: number | null
}

export interface TracerouteResult {
  host: string
  hops: TracerouteHop[]
  destinationReached: boolean
  totalHops: number
  timestamp: Date
  error?: string
}

export class MonitoringService {
  /**
   * Ping a host using system ping command
   */
  static async ping(host: string, count: number = 10): Promise<PingResult> {
    const timestamp = new Date()

    try {
      // Use system ping command (works on both macOS and Linux)
      const isMac = process.platform === 'darwin'
      const command = isMac
        ? `ping -c ${count} -W 2000 ${host}`
        : `ping -c ${count} -W 2 ${host}`

      const { stdout, stderr } = await execAsync(command, {
        timeout: (count + 5) * 1000,
      })

      if (stderr && !stdout) {
        throw new Error(stderr)
      }

      // Parse ping output
      const lines = stdout.split('\n')

      // Find statistics line
      const statsLine = lines.find(line => line.includes('packets transmitted'))
      const rttLine = lines.find(line => line.includes('min/avg/max'))

      if (!statsLine) {
        throw new Error('Failed to parse ping output')
      }

      // Parse packet statistics
      const packetMatch = statsLine.match(/(\d+) packets transmitted, (\d+).*received, ([\d.]+)% packet loss/)
      if (!packetMatch) {
        throw new Error('Failed to parse packet statistics')
      }

      const packetsSent = parseInt(packetMatch[1])
      const packetsReceived = parseInt(packetMatch[2])
      const packetLoss = parseFloat(packetMatch[3])

      // Parse RTT statistics
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
        host,
        isAlive: packetsReceived > 0,
        minRtt,
        avgRtt,
        maxRtt,
        packetLoss,
        packetsSent,
        packetsReceived,
        jitter,
        timestamp,
      }
    } catch (error: any) {
      return {
        host,
        isAlive: false,
        minRtt: null,
        avgRtt: null,
        maxRtt: null,
        packetLoss: 100,
        packetsSent: count,
        packetsReceived: 0,
        jitter: null,
        timestamp,
        error: error.message,
      }
    }
  }

  /**
   * Perform traceroute to a host
   */
  static async traceroute(host: string, maxHops: number = 30): Promise<TracerouteResult> {
    const timestamp = new Date()

    try {
      const isMac = process.platform === 'darwin'
      const command = isMac
        ? `traceroute -m ${maxHops} -w 2 -q 1 ${host}`
        : `traceroute -m ${maxHops} -w 2 -q 1 ${host}`

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 seconds timeout
      })

      if (stderr && !stdout) {
        throw new Error(stderr)
      }

      // Parse traceroute output
      const lines = stdout.split('\n').slice(1) // Skip header
      const hops: TracerouteHop[] = []

      for (const line of lines) {
        if (!line.trim()) continue

        const parts = line.trim().split(/\s+/)
        if (parts.length < 2) continue

        const hopNum = parseInt(parts[0])
        if (isNaN(hopNum)) continue

        const hop: TracerouteHop = {
          hop: hopNum,
          ip: null,
          hostname: null,
          rtt: [],
          avgRtt: null,
        }

        // Parse hostname and IP
        let i = 1
        if (parts[i] && parts[i] !== '*') {
          hop.hostname = parts[i]
          i++

          // Check for IP in parentheses
          if (parts[i] && parts[i].startsWith('(') && parts[i].endsWith(')')) {
            hop.ip = parts[i].slice(1, -1)
            i++
          }
        }

        // Parse RTT values
        while (i < parts.length) {
          if (parts[i] === 'ms') {
            const rtt = parseFloat(parts[i - 1])
            if (!isNaN(rtt)) {
              hop.rtt.push(rtt)
            }
          }
          i++
        }

        // Calculate average RTT
        if (hop.rtt.length > 0) {
          hop.avgRtt = hop.rtt.reduce((a, b) => a + b, 0) / hop.rtt.length
        }

        hops.push(hop)
      }

      const destinationReached = hops.length > 0 && hops[hops.length - 1].ip !== null

      return {
        host,
        hops,
        destinationReached,
        totalHops: hops.length,
        timestamp,
      }
    } catch (error: any) {
      return {
        host,
        hops: [],
        destinationReached: false,
        totalHops: 0,
        timestamp,
        error: error.message,
      }
    }
  }
}
