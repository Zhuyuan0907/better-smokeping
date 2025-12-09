/**
 * Create admin user script
 * Usage: node scripts/create-admin.js <username> <password>
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin(username, password) {
  try {
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { username },
    })

    if (existing) {
      console.log(`❌ Admin user "${username}" already exists`)
      process.exit(1)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
      },
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`   Username: ${admin.username}`)
    console.log(`   ID: ${admin.id}`)
    console.log(`\n🔐 You can now login at: http://your-server:3000/admin/login`)
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get command line arguments
const username = process.argv[2]
const password = process.argv[3]

if (!username || !password) {
  console.log('Usage: node scripts/create-admin.js <username> <password>')
  console.log('Example: node scripts/create-admin.js admin mypassword')
  process.exit(1)
}

createAdmin(username, password)
