/**
 * Sync configuration file to database
 * This script reads config/smokeping.conf and syncs it to the database
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'smokeping.conf')

// 簡化版配置解析器（Node.js 版本）
function parseSmokepingConfig(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8')
  const lines = content.split('\n')

  const config = {
    general: { pings: 20, step: 60 },
    probes: new Map(),
    targets: [],
  }

  let section = null
  let currentProbe = null
  let targetStack = []
  let currentTarget = null
  let targetIdCounter = 1

  for (let line of lines) {
    const commentIndex = line.indexOf('#')
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex)
    }
    line = line.trim()
    if (!line) continue

    if (line.startsWith('***') && line.endsWith('***')) {
      const sectionName = line.replace(/\*/g, '').trim().toLowerCase()
      section = sectionName === 'general' ? 'general' : sectionName === 'probes' ? 'probes' : sectionName === 'targets' ? 'targets' : null
      continue
    }

    if (section === 'general') {
      const [key, value] = line.split('=').map((s) => s.trim())
      if (key === 'pings') config.general.pings = parseInt(value)
      else if (key === 'step') config.general.step = parseInt(value)
    } else if (section === 'probes') {
      if (line.startsWith('+')) {
        const probeName = line.substring(1).trim()
        currentProbe = { name: probeName, type: probeName }
        config.probes.set(probeName, currentProbe)
      } else if (currentProbe) {
        const [key, value] = line.split('=').map((s) => s.trim())
        if (key === 'pings') currentProbe.pings = parseInt(value)
        else currentProbe[key] = value
      }
    } else if (section === 'targets') {
      const plusMatch = line.match(/^\++/)
      const plusCount = plusMatch ? plusMatch[0].length : 0

      if (plusCount > 0) {
        const targetName = line.substring(plusCount).trim()
        const level = plusCount

        while (targetStack.length > 0 && targetStack[targetStack.length - 1].level >= level) {
          targetStack.pop()
        }

        const newTarget = {
          id: `target-${targetIdCounter++}`,
          name: targetName,
          menu: targetName,
          title: targetName,
          enabled: true,
          level: level,
          children: [],
        }

        if (targetStack.length > 0) {
          const parent = targetStack[targetStack.length - 1].target
          newTarget.parent = parent.id
          parent.children = parent.children || []
          parent.children.push(newTarget)
        } else {
          config.targets.push(newTarget)
        }

        targetStack.push({ level, target: newTarget })
        currentTarget = newTarget
      } else if (currentTarget) {
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

function flattenTargets(targets, group = '') {
  const result = []

  function traverse(target, currentGroup) {
    const newGroup = currentGroup ? `${currentGroup} > ${target.menu}` : target.menu

    if (target.host) {
      result.push({
        ...target,
        group: currentGroup || '未分類',
      })
    }

    if (target.children) {
      for (const child of target.children) {
        traverse(child, newGroup)
      }
    }
  }

  for (const target of targets) {
    traverse(target, group)
  }

  return result
}

async function syncConfig() {
  try {
    console.log('🔄 同步配置到數據庫...')

    // Read and parse config file
    const config = parseSmokepingConfig(CONFIG_PATH)
    const flatTargets = flattenTargets(config.targets)

    console.log(`📋 在配置中找到 ${flatTargets.length} 個監測目標`)

    // Get existing targets
    const existingTargets = await prisma.target.findMany()
    const existingNames = new Set(existingTargets.map((t) => t.name))

    let added = 0
    let updated = 0

    // Sync each target
    for (const targetConfig of flatTargets) {
      const { name, host, title, group, enabled, probe, pings, port } = targetConfig

      const data = {
        host,
        description: title || null,
        group: group || '未分類',
        enabled: enabled !== false,
      }

      if (existingNames.has(name)) {
        await prisma.target.update({
          where: { name },
          data,
        })
        updated++
        console.log(`  ✏️  更新: ${name}`)
      } else {
        await prisma.target.create({
          data: { name, ...data },
        })
        added++
        console.log(`  ➕ 新增: ${name}`)
      }
    }

    console.log('')
    console.log('✅ 同步完成！')
    console.log(`   新增: ${added}`)
    console.log(`   更新: ${updated}`)
    console.log('')
    console.log('💡 提示: 編輯 config/smokeping.conf 來添加或修改監測目標')
    console.log('   Then run: npm run sync-config')

  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncConfig()
