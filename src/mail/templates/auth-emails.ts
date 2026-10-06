import { defineComponent, h } from 'vue';
import { Heading, Text } from '@vue-email/components';
import { CtaButton, EmailLayout } from './layout.js';

const ZINC400 = '#a1a1aa';
const ZINC500 = '#71717a';

export interface MagicLinkTemplateProps {
  name: string;
  link: string;
}

export function magicLinkPlainText(props: MagicLinkTemplateProps): string {
  return [
    `Olá, ${props.name}!`,
    `Entre no plann.er pelo link: ${props.link}`,
    'O link é válido por 15 minutos e pode ser usado uma única vez.',
    'Se você não solicitou, ignore este e-mail.',
  ].join('\n');
}

export const MagicLinkTemplate = defineComponent({
  props: {
    name: { type: String, required: true },
    link: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(EmailLayout, {
        preheader: `Seu link de acesso ao plann.er — válido por 15 minutos`,
        footerText: 'Se você não solicitou este acesso, ignore este e-mail.',
        }, () => [
        h(Text, { style: { color: ZINC400, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' } }, () => 'Acesso'),
        h(Heading, { as: 'h1', style: { color: '#ffffff', fontSize: '22px', margin: '0 0 4px', fontWeight: 'bold' } }, () => `Olá, ${props.name}!`),
        h(Text, { style: { color: ZINC400, fontSize: '15px', margin: '0 0 8px' } }, () => 'Clique no botão abaixo para entrar — sem senha, sem burocracia.'),

        h(CtaButton, { href: props.link, label: 'Entrar no plann.er' }),

        h(Text, { style: { color: ZINC500, fontSize: '12px', textAlign: 'center', margin: '0' } }, () => 'O link é válido por 15 minutos e pode ser usado uma única vez.'),
      ]);
  },
});

export interface ResetPasswordTemplateProps {
  name: string;
  link: string;
}

export function resetPasswordPlainText(props: ResetPasswordTemplateProps): string {
  return [
    `Olá, ${props.name}!`,
    `Redefina sua senha pelo link: ${props.link}`,
    'O link é válido por 30 minutos.',
    'Se você não solicitou, ignore este e-mail.',
  ].join('\n');
}

export const ResetPasswordTemplate = defineComponent({
  props: {
    name: { type: String, required: true },
    link: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(EmailLayout, {
        preheader: `Redefinição de senha do plann.er — válida por 30 minutos`,
        footerText: 'Se você não solicitou esta redefinição, ignore este e-mail.',
        }, () => [
        h(Text, { style: { color: ZINC400, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' } }, () => 'Segurança'),
        h(Heading, { as: 'h1', style: { color: '#ffffff', fontSize: '22px', margin: '0 0 4px', fontWeight: 'bold' } }, () => `Olá, ${props.name}!`),
        h(Text, { style: { color: ZINC400, fontSize: '15px', margin: '0 0 8px' } }, () => 'Use o botão abaixo para definir uma nova senha.'),

        h(CtaButton, { href: props.link, label: 'Redefinir senha' }),

        h(Text, { style: { color: ZINC500, fontSize: '12px', textAlign: 'center', margin: '0' } }, () => 'O link é válido por 30 minutos.'),
      ]);
  },
});
