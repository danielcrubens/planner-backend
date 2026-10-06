import { defineComponent, h } from 'vue';
import {
  Body,
  Button,
  Container,
  Html,
  Preview,
  Section,
  Text,
} from '@vue-email/components';

const FONT = 'Inter, Helvetica, Arial, sans-serif';
const LIME = '#a3e635';
const ZINC950 = '#09090b';
const ZINC900 = '#18181b';
const ZINC500 = '#71717a';

/** "plann.er" pareceria um domínio (.er) e o Gmail auto-linkifica — o
 *  word-joiner invisível quebra a detecção sem mudar o texto. */
const WORDMARK = 'plann⁠.er';

export interface EmailLayoutProps {
  /** texto do preheader (aparece ao lado do assunto na caixa de entrada) */
  preheader: string;
  /** texto do rodapé */
  footerText: string;
}

/** Chrome comum de todos os e-mails: wordmark, card escuro e rodapé.
 *  O conteúdo específico vai no slot default (cai dentro do card). */
export const EmailLayout = defineComponent({
  props: {
    preheader: { type: String, required: true },
    footerText: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () =>
      h(Html, { lang: 'pt-BR' }, () => [
        h(Preview, () => props.preheader),
        h(Body, { style: { backgroundColor: ZINC950, fontFamily: FONT, margin: '0', padding: '16px 0' } }, () => [
          h(Container, { style: { maxWidth: '560px', margin: '0 auto', padding: '0 16px' } }, () => [
            h(Text, { style: { color: LIME, fontSize: '20px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 16px' } }, () => WORDMARK),

            h(Section, { style: { backgroundColor: ZINC900, borderRadius: '12px', padding: '24px' } }, () => slots.default?.()),

            h(Text, { style: { color: ZINC500, fontSize: '10px', textAlign: 'center', margin: '14px 0 0' } }, () => `${props.footerText} ${WORDMARK}.`),
          ]),
        ]),
      ]);
  },
});

/** Botão lime "bulletproof" (table + padding) usado em todos os CTAs. */
export const CtaButton = defineComponent({
  props: { href: { type: String, required: true }, label: { type: String, required: true } },
  setup(props) {
    return () =>
      h(Section, { style: { textAlign: 'center', margin: '16px 0 12px' } }, () => [
        h(Button, {
          href: props.href,
          style: {
            backgroundColor: LIME,
            color: ZINC950,
            fontWeight: 'bold',
            fontSize: '15px',
            padding: '12px 28px',
            borderRadius: '8px',
            textDecoration: 'none',
          },
        }, () => props.label),
      ]);
  },
});
