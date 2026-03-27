const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Check if owner already exists
  const existingOwner = await prisma.user.findFirst({
    where: { role: 'owner' }
  });

  if (existingOwner) {
    console.log('Owner account already exists');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash('115457', 10);

  // Create owner account
  const owner = await prisma.user.create({
    data: {
      username: 'ryan',
      password: hashedPassword,
      role: 'owner',
      isActive: true,
      subscriptionEnd: null // Owner has no subscription limit
    }
  });

  console.log('Owner account created:', owner.username);

  // Create some default categories
  const categories = [
    { name: 'Movies', slug: 'movies', description: 'Feature films and cinema' },
    { name: 'Series', slug: 'series', description: 'TV series and episodes' },
    { name: 'Sports', slug: 'sports', description: 'Sports channels and events' },
    { name: 'Kids', slug: 'kids', description: 'Content for children' },
    { name: 'News', slug: 'news', description: 'News channels' },
  ];

  for (const category of categories) {
    await prisma.category.create({
      data: category
    });
  }

  console.log('Default categories created');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
