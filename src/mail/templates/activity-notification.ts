import { defineComponent, h } from 'vue';
import { Heading, Section, Text } from '@vue-email/components';
import { CtaButton, EmailLayout } from './layout.js';

const ZINC400 = '#a1a1aa';
const ZINC500 = '#71717a';

/** "11 de nov. às 14:00" — compacto, para listas. */
export function ptDateTime(date: Date): string {
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day} às ${time}`;
}

export interface ActivityNotificationProps {
  destination: string;
  activities: { title: string; when: string }[];
  link: string;
}

export function activityNotificationPlainText(props: ActivityNotificationProps): string {
  const list = props.activities.map((a) => `- ${a.title} (${a.when})`).join('\n');
  return [
    `Nova(s) atividade(s) na viagem para ${props.destination}:`,
    list,
    `Veja na viagem: ${props.link}`,
  ].join('\n');
}

/** Aviso de novas atividades — um único e-mail agrupando o lote, com login automático no link. */
export const ActivityNotificationTemplate = defineComponent({
  props: {
    destination: { type: String, required: true },
    activities: { type: Array as () => { title: string; when: string }[], required: true },
    link: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(EmailLayout, {
        preheader: `${props.activities.length} nova(s) atividade(s) em ${props.destination}`,
        footerText: 'Você recebeu este e-mail porque participa de uma viagem no',
      }, () => [
        h(Text, { style: { color: ZINC400, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' } }, () => 'Programação atualizada'),
        h(Heading, { as: 'h1', style: { color: '#ffffff', fontSize: '22px', margin: '0 0 4px', fontWeight: 'bold' } }, () => props.destination),
        h(Text, { style: { color: ZINC400, fontSize: '15px', margin: '0 0 16px' } }, () => 'Nova(s) atividade(s) adicionada(s) à viagem:'),

        h(
          Section,
          {},
          () =>
            props.activities.map((activity) =>
              h(Section, { style: { backgroundColor: '#09090b', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' } }, () => [
                h(Text, { style: { color: '#ffffff', fontSize: '15px', fontWeight: 'bold', margin: '0' } }, () => activity.title),
                h(Text, { style: { color: ZINC400, fontSize: '13px', margin: '2px 0 0' } }, () => activity.when),
              ]),
            ),
        ),

        h(CtaButton, { href: props.link, label: 'Ver viagem' }),

        h(Text, { style: { color: ZINC500, fontSize: '12px', textAlign: 'center', margin: '0' } }, () => 'O link autentica você automaticamente e é válido por 1 hora.'),
      ]);
  },
});
