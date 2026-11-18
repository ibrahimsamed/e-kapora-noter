import nodemailer from "nodemailer";

/** E-posta gönderimi: kendi alan adınızın SMTP hesabı üzerinden. */

export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // Google uygulama parolası boşluklu gösterilir
  const from = process.env.MAIL_FROM || user;
  if (!host || !user || !pass || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[mail:dev] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}`);
      return;
    }
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS tanımlı değil.");
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465: doğrudan TLS, 587: STARTTLS
    auth: { user, pass },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function resetMail(name: string, link: string) {
  const text = `Merhaba ${name},\n\nParolanızı sıfırlamak için aşağıdaki bağlantıyı kullanın (1 saat geçerlidir):\n${link}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; parolanız değişmez.\n\ne-kapora noter`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#253247">
<h2 style="color:#0f2a4a">Parola sıfırlama</h2>
<p>Merhaba ${esc(name)},</p>
<p>Parolanızı sıfırlamak için aşağıdaki düğmeyi kullanın. Bağlantı <b>1 saat</b> geçerlidir ve yalnızca bir kez kullanılabilir.</p>
<p style="margin:24px 0"><a href="${esc(link)}" style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Parolamı sıfırla</a></p>
<p style="font-size:12px;color:#64748b">Düğme çalışmazsa şu adresi tarayıcınıza yapıştırın:<br>${esc(link)}</p>
<p style="font-size:12px;color:#64748b">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; parolanız değişmez.</p></div>`;
  return { subject: "Parola sıfırlama bağlantınız — e-kapora noter", text, html };
}

export function verifyMail(name: string, code: string) {
  const text = `Merhaba ${name},\n\ne-kapora noter hesap doğrulama kodunuz: ${code}\n\nKod 5 dakika geçerlidir. Kimseyle paylaşmayın. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\ne-kapora noter`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#253247">
<h2 style="color:#0f2a4a">Hesap doğrulama</h2>
<p>Merhaba ${esc(name)},</p>
<p>Hesabınızı oluşturmak için doğrulama kodunuz:</p>
<p style="margin:24px 0;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1d4ed8">${esc(code)}</p>
<p style="font-size:12px;color:#64748b">Kod 5 dakika geçerlidir. Kimseyle paylaşmayın. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p></div>`;
  return { subject: `Doğrulama kodunuz: ${code} — e-kapora noter`, text, html };
}
