import { NextResponse } from "next/server";
import { createSession, destroySession } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import * as S from "@/lib/services";
import { homeFor } from "@/lib/session";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const { action, payload } = (await req.json()) as { action: string; payload: any };
    const p = payload ?? {};
    switch (action) {
      case "login": {
        const u = await S.loginWithPassword(String(p.email ?? ""), String(p.password ?? ""));
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
      }
      case "register.start": return ok(await S.startRegistration(p));
      case "register.verify": {
        const u = await S.verifyRegistration(String(p.otpId ?? ""), String(p.code ?? ""));
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
      }
      case "otp.request": return ok(await S.requestOtp(String(p.phone ?? ""), p.txId ? String(p.txId) : undefined));
      case "otp.verify": {
        const u = await S.verifyOtp(String(p.phone ?? ""), String(p.code ?? ""));
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
      }
      case "password.forgot": {
        await S.requestPasswordReset(String(p.email ?? ""));
        return ok(); // hesap var/yok bilgisi sızdırılmaz
      }
      case "password.reset": {
        await S.resetPassword(String(p.token ?? ""), String(p.password ?? ""));
        return ok();
      }
      case "logout": {
        await destroySession();
        return ok();
      }
      default: return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
    }
  } catch (e) {
    return handleError(e);
  }
}
