import { defineComponent, h } from 'vue';
import { Heading, Section, Text } from '@vue-email/components';
import { CtaButton, EmailLayout } from './layout.js';

const ZINC400 = '#a1a1aa';
const ZINC500 = '#71717a';

/** "4 a 10 de outubro de 2026" em pt-BR, sem dependências (Intl nativo).
 *  Datas de viagem são @db.Date (meia-noite UTC) — formatar em UTC, nunca no fuso local. */
export function ptDateRange(start: Date, end: Date): string {
  const dayMonth = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
  const full = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  const sameDay = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  return sameDay ? full(start) : `${dayMonth(start)} a ${full(end)}`;
}

export interface InviteTemplateProps {
  ownerName: string;
  destination: string;
  dateRange: string;
  link: string;
  expiresInDays: number;
}

/** E-mail de convite — conteúdo no card do layout compartilhado. */
export const InviteTemplate = defineComponent({
  props: {
    ownerName: { type: String, required: true },
    destination: { type: String, required: true },
    dateRange: { type: String, required: true },
    link: { type: String, required: true },
    expiresInDays: { type: Number, required: true },
  },
  setup(props) {
    return () =>
      h(EmailLayout, {
        preheader: `${props.ownerName} convidou você para ${props.destination} — aceite até ${props.dateRange}`,
        footerText: 'Você recebeu este e-mail porque foi convidado para uma viagem no',
      }, () => [
        h(Text, { style: { color: ZINC400, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' } }, () => 'Convite de viagem'),
        h(Heading, { as: 'h1', style: { color: '#ffffff', fontSize: '26px', margin: '0 0 4px', fontWeight: 'bold' } }, () => props.destination),
        h(Text, { style: { color: ZINC400, fontSize: '15px', margin: '0 0 24px' } }, () => `${props.ownerName} convidou você para viajar de ${props.dateRange}.`),

        h(CtaButton, { href: props.link, label: 'Aceitar convite' }),

        h(Text, { style: { color: ZINC500, fontSize: '12px', textAlign: 'center', margin: '0' } }, () => `O link é válido por ${props.expiresInDays} dia.`),
      ]);
  },
});

export function invitePlainText(props: InviteTemplateProps): string {
  return [
    `${props.ownerName} convidou você para a viagem para ${props.destination} (${props.dateRange}).`,
    `Aceite o convite no link: ${props.link}`,
    `O link é válido por ${props.expiresInDays} dia.`,
  ].join('\n');
}
