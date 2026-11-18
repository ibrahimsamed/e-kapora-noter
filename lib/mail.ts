/** E-posta gönderimi (Resend REST API). RESEND_API_KEY ve MAIL_FROM tanımlı olmalı. */

export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[mail:dev] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}`);
      return;
    }
    throw new Error("RESEND_API_KEY / MAIL_FROM tanımlı değil.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
  });
  if (!res.ok) throw new Error(`E-posta gönderilemedi (HTTP ${res.status}).`);
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
