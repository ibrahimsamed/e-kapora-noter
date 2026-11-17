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
        const u = S.loginWithPassword(String(p.email ?? ""), String(p.password ?? ""));
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
      }
      case "register": {
        const u = S.registerSeller(p);
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
      }
      case "otp.request": return ok(S.requestOtp(String(p.phone ?? ""), p.txId ? String(p.txId) : undefined));
      case "otp.verify": {
        const u = S.verifyOtp(String(p.phone ?? ""), String(p.code ?? ""));
        await createSession(u.id);
        return ok({ home: homeFor(u.role) });
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
