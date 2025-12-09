/**
 * Seed script to add default monitoring targets
 * Run this after initial setup to add some common targets
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const defaultTargets = [
  {
    name: 'Google DNS',
    host: '8.8.8.8',
    description: 'Google Public DNS Server',
    group: 'DNS Servers',
  },
  {
    name: 'Cloudflare DNS',
    host: '1.1.1.1',
    description: 'Cloudflare Public DNS Server',
    group: 'DNS Servers',
  },
  {
    name: 'Google',
    host: 'google.com',
    description: 'Google Search Engine',
    group: 'Websites',
  },
  {
    name: 'GitHub',
    host: 'github.com',
    description: 'GitHub Code Hosting',
    group: 'Websites',
  },
  {
    name: 'Local Gateway',
    host: '192.168.1.1',
    description: 'Local Network Gateway',
    group: 'Local Network',
  },
]

async function seed() {
  console.log('Seeding database with default targets...')

  for (const target of defaultTargets) {
    try {
      const existing = await prisma.target.findUnique({
        where: { name: target.name },
      })

      if (existing) {
        console.log(`  ⏭  ${target.name} already exists, skipping...`)
        continue
      }

      await prisma.target.create({
        data: target,
      })

      console.log(`  ✓ Added ${target.name} (${target.host})`)
    } catch (error) {
      console.error(`  ✗ Failed to add ${target.name}:`, error.message)
    }
  }

  console.log('\nSeeding completed!')
  console.log('Monitoring service will start collecting data automatically.')
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
