import { currentActor } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import * as S from "@/lib/services";
import { NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const actor = await currentActor();
    if (!actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    const { action, payload } = (await req.json()) as { action: string; payload: any };
    const p = payload ?? {};
    switch (action) {
      case "tx.create": return ok(S.createTransaction(actor, p));
      case "tx.pay": return ok(S.payTransaction(actor, p));
      case "tx.confirm": return ok(S.confirmTransaction(actor, p.txId));
      case "tx.cancelUnpaid": return ok(S.cancelUnpaid(actor, p.txId));
      case "tx.requestCancel": return ok(S.requestCancel(actor, p));
      case "tx.respondCancel": return ok(S.respondCancel(actor, p));
      case "tx.processRefund": return ok(S.processRefund(actor, p.txId));
      case "dispute.open": return ok(S.openDispute(actor, p));
      case "dispute.statement": return ok(S.addDisputeStatement(actor, p));
      case "dispute.resolve": return ok(S.resolveDispute(actor, p));
      case "withdrawal.request": return ok(S.requestWithdrawal(actor, p));
      case "withdrawal.decide": return ok(S.decideWithdrawal(actor, p));
      case "user.setActive": return ok(S.setUserActive(actor, p));
      case "settings.update": return ok(S.updateSettings(actor, p));
      case "profile.update": return ok(S.updateProfile(actor, p));
      default: return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
    }
  } catch (e) {
    return handleError(e);
  }
}
