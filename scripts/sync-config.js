/**
 * Sync configuration file to database
 * This script reads config/targets.json and syncs it to the database
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'targets.json')

async function syncConfig() {
  try {
    console.log('🔄 Syncing configuration to database...')

    // Read config file
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(configData)

    console.log(`📋 Found ${config.targets.length} targets in config`)

    // Get existing targets
    const existingTargets = await prisma.target.findMany()
    const existingNames = new Set(existingTargets.map(t => t.name))

    let added = 0
    let updated = 0
    let skipped = 0

    // Sync each target
    for (const targetConfig of config.targets) {
      const { name, host, description, group, enabled } = targetConfig

      if (existingNames.has(name)) {
        // Update existing target
        await prisma.target.update({
          where: { name },
          data: {
            host,
            description: description || null,
            group: group || 'default',
            enabled: enabled !== false,
          },
        })
        updated++
        console.log(`  ✏️  Updated: ${name}`)
      } else {
        // Create new target
        await prisma.target.create({
          data: {
            name,
            host,
            description: description || null,
            group: group || 'default',
            enabled: enabled !== false,
          },
        })
        added++
        console.log(`  ➕ Added: ${name}`)
      }
    }

    console.log('')
    console.log('✅ Sync completed!')
    console.log(`   Added: ${added}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log('')
    console.log('💡 Tip: Edit config/targets.json to add or modify targets')
    console.log('   Then run: npm run sync-config')

  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncConfig()
