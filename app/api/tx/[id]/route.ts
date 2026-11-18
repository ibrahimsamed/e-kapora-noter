import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { readDb, txDetail } from "@/lib/queries";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await ctx.params;
  const d = txDetail((await readDb()), id, u.role, u.id);
  if (!d) return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
  return NextResponse.json({ data: d });
}
