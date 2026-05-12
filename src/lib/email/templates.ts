export function buildPasswordSetupEmail({
  userName,
  tenantName,
  setupUrl,
}: {
  userName: string;
  tenantName: string;
  setupUrl: string;
}) {
  const subject = "Convite de acesso ao Partsec One Portal";

  const text = `
Olá, ${userName}.

Você foi convidado para acessar o Partsec One Portal do cliente ${tenantName}.

Para definir sua senha inicial, acesse o link abaixo:

${setupUrl}

Este link expira em 24 horas e só pode ser usado uma vez.

Se você não esperava este convite, ignore este e-mail.

Partsec One
`;

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#071426;padding:28px 32px;color:#ffffff;">
                <div style="font-size:22px;font-weight:700;">Partsec One</div>
                <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">Customer Portal</div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0;font-size:24px;line-height:32px;color:#0f172a;">
                  Convite de acesso
                </h1>

                <p style="margin:20px 0 0;font-size:15px;line-height:24px;color:#475569;">
                  Olá, <strong>${userName}</strong>.
                </p>

                <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:#475569;">
                  Você foi convidado para acessar o <strong>Partsec One Portal</strong> do cliente
                  <strong>${tenantName}</strong>.
                </p>

                <p style="margin:20px 0 0;font-size:15px;line-height:24px;color:#475569;">
                  Para definir sua senha inicial, clique no botão abaixo:
                </p>

                <div style="margin:28px 0;">
                  <a href="${setupUrl}"
                     style="display:inline-block;background:#071426;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;border-radius:16px;">
                    Definir minha senha
                  </a>
                </div>

                <p style="margin:0;font-size:13px;line-height:22px;color:#64748b;">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>

                <p style="margin:8px 0 0;font-size:12px;line-height:20px;color:#334155;word-break:break-all;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                  ${setupUrl}
                </p>

                <p style="margin:20px 0 0;font-size:13px;line-height:22px;color:#64748b;">
                  Este link expira em 24 horas e só pode ser usado uma vez.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:20px;color:#64748b;">
                  Se você não esperava este convite, ignore este e-mail.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  return {
    subject,
    text,
    html,
  };
}
