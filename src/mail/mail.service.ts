import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { render } from '@vue-email/render';
import { getEnv } from '../config/env.js';
import { INVITE_TTL_DAYS } from '../common/tokens.js';
import { InviteTemplate, invitePlainText, ptDateRange } from './templates/invite.js';
import {
  MagicLinkTemplate,
  ResetPasswordTemplate,
  magicLinkPlainText,
  resetPasswordPlainText,
} from './templates/auth-emails.js';

interface TripEvent {
  trip: { id: string; destination: string; startsAt: Date; endsAt: Date };
  ownerName: string;
  invites: { email: string; token: string }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null = null;

  constructor() {
    const env = getEnv();
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
      this.logger.log('Canal de e-mail: Resend (API)');
    } else {
      this.logger.warn('E-mail desativado — defina RESEND_API_KEY (só log no console)');
    }
  }

  @OnEvent('trip.created')
  async onTripCreated({ trip, ownerName, invites }: TripEvent) {
    await this.sendInvites(trip, ownerName, invites);
  }

  @OnEvent('participant.invited')
  async onParticipantInvited({ trip, ownerName, invites }: TripEvent) {
    await this.sendInvites(trip, ownerName, invites);
  }

  @OnEvent('password.reset_requested')
  async onPasswordReset({ email, name, token }: { email: string; name: string; token: string }) {
    const url = `${getEnv().FRONTEND_URL}/reset-password?token=${token}`;
    const props = { name, link: url };
    const html = await render(ResetPasswordTemplate, props);
    await this.send(email, 'Recuperação de senha — plann.er', html, resetPasswordPlainText(props));
  }

  @OnEvent('auth.magic_link_requested')
  async onMagicLinkRequested({ email, name, token }: { email: string; name: string; token: string }) {
    const url = `${getEnv().FRONTEND_URL}/auth/magic/${token}`;
    const props = { name, link: url };
    const html = await render(MagicLinkTemplate, props);
    await this.send(email, 'Seu link de acesso — plann.er', html, magicLinkPlainText(props));
  }

  private async sendInvites(trip: TripEvent['trip'], ownerName: string, invites: TripEvent['invites']) {
    if (invites.length === 0) {
      this.logger.warn('Nenhum convite novo para enviar (e-mails já eram participantes)');
      return;
    }

    this.logger.log(`Enviando ${invites.length} convite(s) da viagem "${trip.destination}"`);
    const dateRange = ptDateRange(trip.startsAt, trip.endsAt);
    await Promise.all(
      invites.map(async ({ email, token }) => {
        const link = `${getEnv().FRONTEND_URL}/invite/${token}`;
        this.logger.log(`[convite] link gerado para ${email}: ${link}`);
        const html = await render(InviteTemplate, {
          ownerName,
          destination: trip.destination,
          dateRange,
          link,
          expiresInDays: INVITE_TTL_DAYS,
        });
        await this.send(
          email,
          `${ownerName} te convidou para ${trip.destination}`,
          html,
          invitePlainText({
            ownerName,
            destination: trip.destination,
            dateRange,
            link,
            expiresInDays: INVITE_TTL_DAYS,
          }),
        );
      }),
    );
  }

  /** Canal bruto para consumidores de domínio (ex.: ActivityNotifierService). Falhas nunca propagam. */
  async send(to: string, subject: string, html: string, text?: string) {
    const from = getEnv().MAIL_FROM;

    if (!this.resend) {
      this.logger.log(`[mail desativado] to=${to} subject="${subject}"`);
      return;
    }

    try {
      const { error } = await this.resend.emails.send({ from, to, subject, html, text });
      if (error) {
        this.logger.error(`[mail FALHOU/resend] to=${to}: ${error.message}`);
        return;
      }
      this.logger.log(`[mail OK/resend] "${subject}" → ${to}`);
    } catch (e) {
      // e-mail não pode derrubar o fluxo principal; fica no log para reenvio manual
      this.logger.error(`[mail FALHOU/resend] to=${to}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
