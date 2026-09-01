import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Família de teste: Vanessa com filho Felipe
  const family = await prisma.family.upsert({
    where: { whatsapp_phone: '5511999999999' },
    update: {},
    create: {
      name: 'Vanessa',
      whatsapp_phone: '5511999999999',
      children: {
        create: [
          {
            name: 'Felipe',
          },
        ],
      },
    },
    include: {
      children: true,
    },
  })

  console.log(`✅ Família criada: ${family.name} (id: ${family.id})`)
  console.log(`✅ Filho: ${family.children[0]?.name} (id: ${family.children[0]?.id})`)
  console.log('🌱 Seed concluído.')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
