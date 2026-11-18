"use client";
import type { TxDetailData } from "./queries";
import { CATEGORY_LABEL, STATUS_META, LEDGER_LABEL } from "./workflow";
import { formatDate, formatDateTime, formatPhone, formatTRY } from "./format";

async function loadFont(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Kurumsal görünümlü, DEMO ibareli işlem belgesi (jsPDF + DejaVu: Türkçe karakter desteği). */
export async function downloadTxPdf(d: TxDetailData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const [reg, bold] = await Promise.all([loadFont("/fonts/DejaVuSans.ttf"), loadFont("/fonts/DejaVuSans-Bold.ttf")]);
  doc.addFileToVFS("DejaVuSans.ttf", reg);
  doc.addFileToVFS("DejaVuSans-Bold.ttf", bold);
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
  doc.setFont("DejaVu", "normal");

  const { tx, seller, customer, payments, ledger } = d;
  const W = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [20, 43, 74];

  // başlık bandı
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 78, "F");
  doc.setFillColor(40, 100, 220);
  doc.roundedRect(36, 24, 30, 30, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("DejaVu", "bold");
  doc.setFontSize(15);
  doc.text("✓", 45, 45);
  doc.setFontSize(17);
  doc.text("e-kapora noter", 76, 40);
  doc.setFont("DejaVu", "normal");
  doc.setFontSize(9);
  doc.text("Dijital güvenli işlem platformu", 76, 54);
  doc.setFontSize(10);
  doc.text("İŞLEM BELGESİ", W - 36, 40, { align: "right" });
  doc.setFontSize(9);
  doc.text(tx.id, W - 36, 54, { align: "right" });

  doc.setTextColor(37, 50, 71);
  doc.setFont("DejaVu", "bold");
  doc.setFontSize(14);
  const title = doc.splitTextToSize(tx.title, W - 72);
  doc.text(title, 36, 130);
  let y = 130 + title.length * 16 + 4;

  const table = (head: string[][] | undefined, body: string[][], startY: number) => {
    autoTable(doc, {
      startY, head, body, theme: "grid", margin: { left: 36, right: 36 },
      styles: { font: "DejaVu", fontSize: 8.5, cellPadding: 5, lineColor: [227, 232, 239], textColor: [37, 50, 71] },
      headStyles: { fillColor: navy, textColor: 255, font: "DejaVu", fontStyle: "bold" },
      columnStyles: head ? undefined : { 0: { fontStyle: "bold", fillColor: [245, 247, 250], cellWidth: 150 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY as number;
  };

  const refund = tx.refund ? `${formatTRY(tx.refund.amount)} — ${formatDateTime(tx.refund.at)} (${tx.refund.reason})` : "İade yok";
  y = table(undefined, [
    ["İşlem ID", tx.id],
    ["İşlem tarihi", formatDateTime(tx.createdAt)],
    ["İşlem türü", CATEGORY_LABEL[tx.category]],
    ["Alıcı (müşteri)", `${customer.name} — ${formatPhone(customer.phone)}`],
    ["Satıcı", `${seller.businessName ?? seller.name} (${seller.name})`],
    ["İşlem tutarı (toplam bedel)", formatTRY(tx.totalAmount)],
    ["Kapora tutarı", formatTRY(tx.deposit)],
    ["Alıcı komisyonu", `${formatTRY(tx.buyerFee)} (%${tx.buyerFeeBps / 100})`],
    ["Satıcı komisyonu", `${formatTRY(tx.sellerFee)} (%${tx.sellerFeeBps / 100})`],
    ["Müşterinin ödeyeceği toplam", formatTRY(tx.deposit + tx.buyerFee)],
    ["İşlem durumu", STATUS_META[tx.status].label],
    ["Güvence altındaki tutar", formatTRY(d.held)],
    ["Hizmet / teslimat tarihi", formatDate(tx.serviceDate)],
    ["Geçerlilik", formatDate(tx.validUntil)],
    ["İade bilgisi", refund],
  ], y);

  y += 16;
  doc.setFont("DejaVu", "bold"); doc.setFontSize(11); doc.text("Anlaşma koşulları", 36, y);
  y = table(undefined, [
    ["Açıklama", tx.description],
    ["İptal koşulları", tx.cancelPolicy],
    ["İade koşulları", tx.refundPolicy],
    ["Teslimat / hizmet", tx.deliveryTerms],
    ...(tx.extraNotes ? [["Ek açıklama", tx.extraNotes]] : []),
  ], y + 6);

  y += 16;
  if (y > 640) { doc.addPage(); y = 50; }
  doc.setFont("DejaVu", "bold"); doc.setFontSize(11); doc.text("Onay kayıtları ve ödeme hareketleri", 36, y);
  y = table([["Kayıt", "Tarih", "Detay"]], [
    ["Satıcı onayı", formatDateTime(tx.sellerConfirmedAt), tx.sellerConfirmedAt ? "Onaylandı" : "Bekleniyor"],
    ["Müşteri onayı", formatDateTime(tx.buyerConfirmedAt), tx.buyerConfirmedAt ? "Onaylandı" : "Bekleniyor"],
    ["Güvence altına alma", formatDateTime(tx.securedAt), tx.securedAt ? "Ödeme güvence altına alındı" : "—"],
    ["Tamamlanma", formatDateTime(tx.completedAt), tx.completedAt ? "İşlem tamamlandı" : "—"],
    ...payments.map((p) => ["Ödeme (kart •••• " + p.cardLast4 + ")", formatDateTime(p.at), `${formatTRY(p.amount)} — ${p.status === "SUCCESS" ? "Başarılı" : "Başarısız: " + (p.failReason ?? "")}`]),
    ...ledger.map((l) => [LEDGER_LABEL[l.kind] ?? l.kind, formatDateTime(l.at), formatTRY(l.amount)]),
  ], y + 6);

  y += 16;
  if (y > 640) { doc.addPage(); y = 50; }
  doc.setFont("DejaVu", "bold"); doc.setFontSize(11); doc.text("İşlem zaman çizelgesi", 36, y);
  y = table([["Tarih", "Olay"]], tx.events.map((e) => [formatDateTime(e.at), e.label]), y + 6);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFont("DejaVu", "normal"); doc.setFontSize(7.5); doc.setTextColor(107, 122, 144);
    doc.text(`Belge oluşturulma: ${formatDateTime(new Date().toISOString())}  •  e-kapora noter  •  Sayfa ${i}/${pages}`, W / 2, H - 20, { align: "center" });
    doc.text("e-kapora noter bir noter veya finans kuruluşu değildir.", W / 2, H - 10, { align: "center" });
  }
  doc.save(`${tx.id}-islem-belgesi.pdf`);
}
