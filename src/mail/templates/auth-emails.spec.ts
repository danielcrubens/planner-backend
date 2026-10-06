import { describe, expect, it } from 'vitest';
import { render } from '@vue-email/render';
import {
  MagicLinkTemplate,
  ResetPasswordTemplate,
  magicLinkPlainText,
  resetPasswordPlainText,
} from './auth-emails.js';

const props = {
  name: 'Simple Louse',
  link: 'http://localhost:5173/auth/magic/abc123',
};

describe('MagicLinkTemplate', () => {
  it('renderiza botão com o link e validade', async () => {
    const html = await render(MagicLinkTemplate, props);
    expect(html).toContain('Entrar no plann.er');
    expect(html).toContain('http://localhost:5173/auth/magic/abc123');
    expect(html).toContain('15 minutos');
  });

  it('inclui preheader e personalização', async () => {
    const html = await render(MagicLinkTemplate, props);
    expect(html).toContain('Seu link de acesso ao plann.er');
    expect(html).toContain('Olá, Simple Louse!');
  });

  it('texto plano contém o link', () => {
    expect(magicLinkPlainText(props)).toContain('auth/magic/abc123');
  });
});

describe('ResetPasswordTemplate', () => {
  it('renderiza botão com o link e validade', async () => {
    const html = await render(ResetPasswordTemplate, props);
    expect(html).toContain('Redefinir senha');
    expect(html).toContain('30 minutos');
  });

  it('rodapé cita o app como texto (sem link)', async () => {
    const html = await render(ResetPasswordTemplate, props);
    expect(html).toContain('plann⁠.er.');
  });

  it('texto plano contém o link', () => {
    expect(resetPasswordPlainText(props)).toContain(props.link);
  });
});
