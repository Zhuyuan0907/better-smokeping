import fs from 'fs'
import path from 'path'

export interface TargetConfig {
  name: string
  host: string
  description?: string
  group?: string
  enabled?: boolean
}

export interface Config {
  targets: TargetConfig[]
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'targets.json')

export function loadConfig(): Config {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('Failed to load config:', error)
    return { targets: [] }
  }
}

export function getTargets(): TargetConfig[] {
  const config = loadConfig()
  return config.targets.filter(t => t.enabled !== false)
}
