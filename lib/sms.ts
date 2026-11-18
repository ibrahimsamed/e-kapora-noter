/** SMS gönderimi: Netgsm REST v2. NETGSM_USERCODE, NETGSM_PASSWORD ve NETGSM_HEADER tanımlı olmalı. */
export async function sendSms(phone10: string, message: string): Promise<void> {
  const usercode = process.env.NETGSM_USERCODE;
  const password = process.env.NETGSM_PASSWORD;
  const header = process.env.NETGSM_HEADER;
  if (!usercode || !password || !header) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms:dev] ${phone10}: ${message}`);
      return;
    }
    throw new Error("NETGSM_USERCODE / NETGSM_PASSWORD / NETGSM_HEADER tanımlı değil.");
  }
  const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${usercode}:${password}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ msgheader: header, messages: [{ msg: message, no: phone10 }], encoding: "TR" }),
    signal: AbortSignal.timeout(10_000),
  });
  let code = "";
  try {
    code = String(((await res.json()) as { code?: string | number }).code ?? "");
  } catch {}
  if (!res.ok || code !== "00") throw new Error(`SMS gönderilemedi (HTTP ${res.status}, Netgsm kodu ${code || "?"}).`);
}
