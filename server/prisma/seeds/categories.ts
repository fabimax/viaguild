import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
  console.log('Seeding categories...');

  const categoryData = [
    {
      name: 'Cat1',
      description: 'The first test category.',
      isSystemCategory: false,
      allowsGuildPrimary: true,
    },
    {
      name: 'Cat2',
      description: 'The second test category.',
      isSystemCategory: false,
      allowsGuildPrimary: true,
    },
    {
      name: 'Cat3',
      description: 'The third test category.',
      isSystemCategory: false,
      allowsGuildPrimary: true,
    },
  ];

  for (const data of categoryData) {
    const nameCi = data.name.toLowerCase();
    const category = await prisma.category.upsert({
      where: { name_ci: nameCi },
      update: { 
        description: data.description,
        isSystemCategory: data.isSystemCategory,
        allowsGuildPrimary: data.allowsGuildPrimary
      }, 
      create: {
        name: data.name,
        name_ci: nameCi,
        description: data.description,
        isSystemCategory: data.isSystemCategory,
        allowsGuildPrimary: data.allowsGuildPrimary,
      },
    });
    console.log(`Upserted category: ${category.name} (ID: ${category.id})`);
  }

  console.log('Categories seeded.');
} 