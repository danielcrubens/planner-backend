import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('senha-segura-123', 12);

  const daniel = await prisma.user.upsert({
    where: { email: 'demo@planner.local' },
    update: {},
    create: {
      name: 'Daniel Rubens',
      email: 'demo@planner.local',
      passwordHash,
    },
  });

  const existingTrip = await prisma.trip.findFirst({
    where: { ownerId: daniel.id, destination: 'Florianópolis' },
  });

  const trip =
    existingTrip ??
    (await prisma.trip.create({
      data: {
        destination: 'Florianópolis',
        startsAt: new Date('2026-11-10T00:00:00.000Z'),
        endsAt: new Date('2026-11-15T00:00:00.000Z'),
        ownerId: daniel.id,
        participants: {
          create: [
            { email: daniel.email, name: daniel.name, isOwner: true, isConfirmed: true, accountId: daniel.id },
            { email: 'amigo@example.com' },
            { email: 'colega@example.com' },
          ],
        },
        activities: {
          create: [
            { title: 'Chegada e check-in', occursAt: new Date('2026-11-10T14:00:00.000Z') },
            { title: 'Passeio na Praia Mole', occursAt: new Date('2026-11-11T09:00:00.000Z') },
            { title: 'Jantar na Lagoa', occursAt: new Date('2026-11-11T20:00:00.000Z') },
          ],
        },
        links: {
          create: [
            { title: 'Reserva do AirBnB', url: 'https://www.airbnb.com.br/rooms/104700011' },
            { title: 'Aluguel de carro', url: 'https://www.localiza.com' },
          ],
        },
      },
    }));

  console.log('Seed OK:');
  console.log('  login: demo@planner.local / senha-segura-123');
  console.log(`  trip:  ${trip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
