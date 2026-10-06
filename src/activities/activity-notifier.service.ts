import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { render } from '@vue-email/render';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { MailService } from '../mail/mail.service.js';
import { getEnv } from '../config/env.js';
import {
  ActivityNotificationTemplate,
  activityNotificationPlainText,
  ptDateTime,
} from '../mail/templates/activity-notification.js';

interface BufferedActivity {
  id: string;
  title: string;
  occursAt: Date;
}

const BATCH_WINDOW_MS = 60_000; // várias atividades em sequência = um único e-mail
const LINK_TTL_MINUTES = 60; // magic link do e-mail: curto, single-use

/**
 * Agrupa atividades criadas em sequência e notifica os convidados confirmados.
 * Roda por evento — falha aqui nunca afeta a criação da atividade.
 */
@Injectable()
export class ActivityNotifierService {
  private readonly logger = new Logger(ActivityNotifierService.name);
  private readonly buffers = new Map<string, { activities: BufferedActivity[]; timer: NodeJS.Timeout }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  @OnEvent('activity.created')
  onActivityCreated(event: { tripId: string; activity: BufferedActivity }) {
    const buffer = this.buffers.get(event.tripId) ?? { activities: [], timer: undefined as unknown as NodeJS.Timeout };
    buffer.activities.push(event.activity);
    if (!buffer.timer) {
      buffer.timer = setTimeout(() => void this.flush(event.tripId), BATCH_WINDOW_MS);
    }
    this.buffers.set(event.tripId, buffer);
  }

  private async flush(tripId: string): Promise<void> {
    const buffer = this.buffers.get(tripId);
    this.buffers.delete(tripId);
    if (!buffer || buffer.activities.length === 0) return;

    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: { destination: true, ownerId: true },
      });
      if (!trip) return;

      // apenas convidados que JÁ ACEITARAM: confirmados, com conta, excluindo o organizador
      const guests = await this.prisma.participant.findMany({
        where: { tripId, isOwner: false, isConfirmed: true, accountId: { not: null } },
        include: { account: { select: { email: true } } },
      });
      if (guests.length === 0) return;

      const activities = buffer.activities
        .slice()
        .sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime())
        .map((a) => ({ title: a.title, when: ptDateTime(a.occursAt), id: a.id }));

      const subject = `${trip.destination}: ${activities.length} nova(s) atividade(s)`;
      let sent = 0;

      for (const guest of guests) {
        try {
          // um magic link por convidado (single-use, 1h) — autentica e destaca a 1ª atividade do lote
          const token = await this.auth.createLoginToken(
            guest.accountId!,
            `/trips/${tripId}?activity=${activities[0].id}`,
            LINK_TTL_MINUTES,
          );
          const link = `${getEnv().FRONTEND_URL}/auth/magic/${token}`;
          const props = {
            destination: trip.destination,
            activities: activities.map(({ title, when }) => ({ title, when })),
            link,
            appUrl: getEnv().FRONTEND_URL,
          };
          const html = await render(ActivityNotificationTemplate, props);
          await this.mail.send(guest.account!.email, subject, html, activityNotificationPlainText(props));
          sent += 1;
        } catch (e) {
          this.logger.error(`Falha ao notificar ${guest.email}: ${e instanceof Error ? e.message : e}`);
        }
      }

      this.logger.log(`[atividades] ${sent}/${guests.length} convidado(s) notificado(s) da viagem ${tripId} (${activities.length} atividade(s) no lote)`);
    } catch (e) {
      this.logger.error(`Falha ao processar lote de atividades da viagem ${tripId}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
