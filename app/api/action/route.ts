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
      case "tx.create": return ok(await S.createTransaction(actor, p));
      case "tx.pay": return ok(await S.payTransaction(actor, p));
      case "tx.notifyTransfer": return ok(await S.notifyTransfer(actor, p.txId));
      case "tx.decideTransfer": return ok(await S.decideTransfer(actor, p));
      case "tx.confirm": return ok(await S.confirmTransaction(actor, p.txId));
      case "tx.cancelUnpaid": return ok(await S.cancelUnpaid(actor, p.txId));
      case "tx.requestCancel": return ok(await S.requestCancel(actor, p));
      case "tx.respondCancel": return ok(await S.respondCancel(actor, p));
      case "tx.processRefund": return ok(await S.processRefund(actor, p.txId));
      case "dispute.open": return ok(await S.openDispute(actor, p));
      case "dispute.statement": return ok(await S.addDisputeStatement(actor, p));
      case "dispute.resolve": return ok(await S.resolveDispute(actor, p));
      case "withdrawal.request": return ok(await S.requestWithdrawal(actor, p));
      case "withdrawal.decide": return ok(await S.decideWithdrawal(actor, p));
      case "user.setActive": return ok(await S.setUserActive(actor, p));
      case "settings.update": return ok(await S.updateSettings(actor, p));
      case "profile.update": return ok(await S.updateProfile(actor, p));
      default: return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
    }
  } catch (e) {
    return handleError(e);
  }
}
