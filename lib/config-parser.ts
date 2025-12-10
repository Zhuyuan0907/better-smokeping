/**
 * Smokeping 配置文件解析器
 * 解析類似 Smokeping 的階層式配置文件
 */

import fs from 'fs'
import path from 'path'

export interface ProbeConfig {
  name: string
  type: string
  binary?: string
  pings?: number
  lookup?: string
  port?: number
  [key: string]: any
}

export interface TargetConfig {
  id: string
  name: string
  menu: string
  title: string
  host?: string
  probe?: string
  enabled: boolean
  level: number
  parent?: string
  children?: TargetConfig[]
  pings?: number
  port?: number
  lookup?: string
  [key: string]: any
}

export interface SmokepingConfig {
  general: {
    pings: number
    step: number
  }
  probes: Map<string, ProbeConfig>
  targets: TargetConfig[]
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'smokeping.conf')

/**
 * 解析配置文件
 */
export function parseConfig(configPath: string = CONFIG_PATH): SmokepingConfig {
  const content = fs.readFileSync(configPath, 'utf-8')
  const lines = content.split('\n')

  const config: SmokepingConfig = {
    general: {
      pings: 20,
      step: 60,
    },
    probes: new Map(),
    targets: [],
  }

  let section: 'general' | 'probes' | 'targets' | null = null
  let currentProbe: ProbeConfig | null = null
  let targetStack: { level: number; target: TargetConfig }[] = []
  let currentTarget: TargetConfig | null = null
  let targetIdCounter = 1

  for (let line of lines) {
    // 移除註釋
    const commentIndex = line.indexOf('#')
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex)
    }
    line = line.trim()

    if (!line) continue

    // 檢測章節
    if (line.startsWith('***') && line.endsWith('***')) {
      const sectionName = line.replace(/\*/g, '').trim().toLowerCase()
      if (sectionName === 'general') section = 'general'
      else if (sectionName === 'probes') section = 'probes'
      else if (sectionName === 'targets') section = 'targets'
      continue
    }

    // 解析 General 設置
    if (section === 'general') {
      const [key, value] = line.split('=').map((s) => s.trim())
      if (key === 'pings') config.general.pings = parseInt(value)
      else if (key === 'step') config.general.step = parseInt(value)
    }

    // 解析 Probes
    else if (section === 'probes') {
      if (line.startsWith('+')) {
        const probeName = line.substring(1).trim()
        currentProbe = {
          name: probeName,
          type: probeName,
        }
        config.probes.set(probeName, currentProbe)
      } else if (currentProbe) {
        const [key, value] = line.split('=').map((s) => s.trim())
        if (key === 'pings') currentProbe.pings = parseInt(value)
        else currentProbe[key] = value
      }
    }

    // 解析 Targets
    else if (section === 'targets') {
      // 檢測層級
      const plusCount = line.match(/^\++/)?.[0].length || 0

      if (plusCount > 0) {
        // 這是一個目標定義
        const targetName = line.substring(plusCount).trim()
        const level = plusCount

        // 彈出比當前層級高的目標
        while (targetStack.length > 0 && targetStack[targetStack.length - 1].level >= level) {
          targetStack.pop()
        }

        // 創建新目標
        const newTarget: TargetConfig = {
          id: `target-${targetIdCounter++}`,
          name: targetName,
          menu: targetName,
          title: targetName,
          enabled: true,
          level: level,
          children: [],
        }

        // 設置父子關係
        if (targetStack.length > 0) {
          const parent = targetStack[targetStack.length - 1].target
          newTarget.parent = parent.id
          parent.children = parent.children || []
          parent.children.push(newTarget)
        } else {
          // 頂層目標
          config.targets.push(newTarget)
        }

        targetStack.push({ level, target: newTarget })
        currentTarget = newTarget
      } else if (currentTarget) {
        // 這是目標的屬性
        const [key, value] = line.split('=').map((s) => s.trim())
        if (key === 'enabled') currentTarget.enabled = value === 'true'
        else if (key === 'pings') currentTarget.pings = parseInt(value)
        else if (key === 'port') currentTarget.port = parseInt(value)
        else currentTarget[key] = value
      }
    }
  }

  return config
}

/**
 * 將階層式目標展平為列表（用於數據庫存儲）
 */
export function flattenTargets(targets: TargetConfig[]): TargetConfig[] {
  const result: TargetConfig[] = []

  function traverse(target: TargetConfig, group: string = '') {
    const currentGroup = group ? `${group} > ${target.menu}` : target.menu

    // 只添加有 host 的目標（葉子節點）
    if (target.host) {
      result.push({
        ...target,
        group: group || '未分類',
      })
    }

    // 遞迴處理子目標
    if (target.children) {
      for (const child of target.children) {
        traverse(child, currentGroup)
      }
    }
  }

  for (const target of targets) {
    traverse(target)
  }

  return result
}

/**
 * 獲取所有啟用的目標（展平）
 */
export function getEnabledTargets(): TargetConfig[] {
  const config = parseConfig()
  const flattened = flattenTargets(config.targets)
  return flattened.filter((t) => t.enabled !== false)
}

/**
 * 獲取配置
 */
export function loadSmokepingConfig(): SmokepingConfig {
  return parseConfig()
}
