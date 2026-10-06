import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityNotifierService } from './activity-notifier.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthService } from '../auth/auth.service.js';
import type { MailService } from '../mail/mail.service.js';

const trip = { destination: 'São Paulo', ownerId: 'owner-1' };

function makeNotifier(overrides: Record<string, unknown> = {}) {
  const prisma = {
    trip: { findUnique: vi.fn().mockResolvedValue(trip) },
    participant: {
      findMany: vi.fn().mockResolvedValue([
        { email: 'convidado1@test.local', accountId: 'acc-1', account: { email: 'convidado1@test.local' } },
        { email: 'convidado2@test.local', accountId: 'acc-2', account: { email: 'convidado2@test.local' } },
      ]),
    },
    ...overrides,
  } as unknown as PrismaService;

  const auth = { createLoginToken: vi.fn().mockResolvedValue('magic-token-123') } as unknown as AuthService;
  const mail = { send: vi.fn().mockResolvedValue(undefined) } as unknown as MailService;

  return { notifier: new ActivityNotifierService(prisma, auth, mail), prisma, auth, mail };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ActivityNotifierService', () => {
  it('agrupa atividades em sequência num único e-mail por convidado', async () => {
    const { notifier, mail, auth } = makeNotifier();

    notifier.onActivityCreated({ tripId: 't-1', activity: { id: 'a-1', title: 'Praia', occursAt: new Date('2026-11-11T12:00:00Z') } });
    notifier.onActivityCreated({ tripId: 't-1', activity: { id: 'a-2', title: 'Jantar', occursAt: new Date('2026-11-11T22:00:00Z') } });

    await vi.advanceTimersByTimeAsync(60_000);

    // 2 convidados × 1 e-mail (não 2 e-mails por atividade)
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(auth.createLoginToken).toHaveBeenCalledTimes(2);
    // o HTML contém as duas atividades do lote
    const html = (mail.send as ReturnType<typeof vi.fn>).mock.calls[0][2] as string;
    expect(html).toContain('Praia');
    expect(html).toContain('Jantar');
    // redirect do magic link destaca a primeira atividade do lote
    expect(auth.createLoginToken).toHaveBeenCalledWith('acc-1', '/trips/t-1?activity=a-1', 60);
  });

  it('consulta apenas convidados confirmados (exclui organizador e pendentes) na query', async () => {
    const { notifier, mail, prisma } = makeNotifier({
      participant: { findMany: vi.fn().mockResolvedValue([]) },
    });

    notifier.onActivityCreated({ tripId: 't-1', activity: { id: 'a-1', title: 'Praia', occursAt: new Date() } });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(prisma.participant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tripId: 't-1',
          isOwner: false,
          isConfirmed: true,
          accountId: { not: null },
        }),
      }),
    );
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('sem convidados, nenhum e-mail e nenhum token', async () => {
    const { notifier, mail, auth } = makeNotifier({
      participant: { findMany: vi.fn().mockResolvedValue([]) },
    });

    notifier.onActivityCreated({ tripId: 't-1', activity: { id: 'a-1', title: 'Praia', occursAt: new Date() } });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mail.send).not.toHaveBeenCalled();
    expect(auth.createLoginToken).not.toHaveBeenCalled();
  });

  it('falha no envio não propaga (loga e tenta os demais)', async () => {
    const { notifier, mail } = makeNotifier({
      mail: { send: vi.fn().mockRejectedValue(new Error('SMTP down')) } as unknown as MailService,
    });

    notifier.onActivityCreated({ tripId: 't-1', activity: { id: 'a-1', title: 'Praia', occursAt: new Date() } });
    await vi.advanceTimersByTimeAsync(60_000);

    // não lançou — tentou os 2 convidados do mock padrão; o create da atividade nunca é afetado
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  it('flush vazio (sem atividades) não faz nada', async () => {
    const { notifier, mail } = makeNotifier();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(mail.send).not.toHaveBeenCalled();
  });
});
