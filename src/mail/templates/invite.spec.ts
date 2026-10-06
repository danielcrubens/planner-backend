import { describe, expect, it } from 'vitest';
import { render } from '@vue-email/render';
import { InviteTemplate, invitePlainText, ptDateRange } from './invite.js';

const props = {
  ownerName: 'Daniel',
  destination: 'São Paulo',
  dateRange: ptDateRange(new Date('2026-10-04'), new Date('2026-10-10')),
  link: 'http://localhost:5173/invite/abc123',
  expiresInDays: 1,
};

describe('InviteTemplate', () => {
  it('renderiza botão com o link do convite', async () => {
    const html = await render(InviteTemplate, props);
    expect(html).toContain('Aceitar convite');
    expect(html).toContain('http://localhost:5173/invite/abc123');
    expect(html).toContain('a3e635'); // lime da marca no botão
  });

  it('personaliza organizador e destino, com preheader', async () => {
    const html = await render(InviteTemplate, props);
    expect(html).toContain('Daniel convidou você para viajar');
    expect(html).toContain('São Paulo');
    expect(html).toContain('Daniel convidou você para São Paulo');
  });

  it('rodapé cita o app como texto (sem link)', async () => {
    const html = await render(InviteTemplate, props);
    expect(html).toContain('uma viagem no plann⁠.er.');
    expect(html).not.toContain('>plann.er</a>');
  });

  it('datas em pt-BR por extenso', () => {
    expect(ptDateRange(new Date('2026-10-04'), new Date('2026-10-10'))).toContain('outubro');
    expect(ptDateRange(new Date('2026-10-10'), new Date('2026-10-10'))).toContain('de outubro de 2026');
  });

  it('datas @db.Date (meia-noite UTC) não caem no dia anterior por fuso do servidor', () => {
    // formato no fuso local (UTC-3) deslocaria para "8 de outubro a 15 de outubro"
    expect(ptDateRange(new Date('2026-10-09T00:00:00.000Z'), new Date('2026-10-16T00:00:00.000Z'))).toBe(
      '9 de outubro a 16 de outubro de 2026',
    );
  });

  it('versão texto plano contém o link', () => {
    const text = invitePlainText(props);
    expect(text).toContain('http://localhost:5173/invite/abc123');
    expect(text).toContain('válido por 1 dia');
  });
});
