import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLatency(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A'
  return `${ms.toFixed(2)} ms`
}

export function formatPacketLoss(loss: number | null): string {
  if (loss === null || loss === undefined) return 'N/A'
  return `${loss.toFixed(1)}%`
}

export function formatUptime(percentage: number | null): string {
  if (percentage === null || percentage === undefined) return 'N/A'
  return `${percentage.toFixed(2)}%`
}

export function getStatusColor(isAlive: boolean, packetLoss: number | null): string {
  if (!isAlive || packetLoss === 100) return 'text-red-500'
  if (packetLoss !== null && packetLoss > 10) return 'text-yellow-500'
  return 'text-green-500'
}

export function getLatencyColor(rtt: number | null): string {
  if (rtt === null) return 'text-gray-500'
  if (rtt < 50) return 'text-green-500'
  if (rtt < 100) return 'text-yellow-500'
  return 'text-red-500'
}
