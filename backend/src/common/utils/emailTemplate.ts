function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envolve título+mensagem (já em português, reaproveitados das notificações in-app) num
 * layout HTML simples e compatível com clientes de email. `title`/`message` podem conter texto
 * livre escrito por um admin (ex: motivo de rejeição/cancelamento), por isso são sempre escapados.
 */
export function wrapEmailHtml(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html lang="pt">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#1f6f43;padding:20px 24px;">
        <span style="color:#ffffff;font-size:18px;font-weight:bold;">Plataforma B2B Alimentar</span>
      </td></tr>
      <tr><td style="padding:24px;color:#1f2933;">
        <h2 style="margin:0 0 12px;font-size:18px;">${safeTitle}</h2>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3e4c59;">${safeMessage}</p>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f8f9fa;font-size:12px;color:#9aa5b1;">
        Esta é uma mensagem automática. Não responda a este email.
      </td></tr>
    </table>
  </body>
</html>`;
}
