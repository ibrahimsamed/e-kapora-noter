"use client";
import { useState } from "react";
import { Button, Modal } from "./ui";
import { TERMS_SECTIONS as SECTIONS } from "@/lib/terms-text";

export function TermsBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink">
      {SECTIONS.map((s) => (
        <section key={s.h}>
          <h4 className="font-semibold text-navy">{s.h}</h4>
          {s.p.map((t) => <p key={t} className="mt-1 text-muted">{t}</p>)}
        </section>
      ))}
    </div>
  );
}

export function TermsModal({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept?: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Şartlar ve Koşullar" wide>
      <TermsBody />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Kapat</Button>
        {onAccept && <Button onClick={() => { onAccept(); onClose(); }}>Okudum, kabul ediyorum</Button>}
      </div>
    </Modal>
  );
}

/** "Şartlar ve koşulları" bağlantısı: tıklayınca metni popup'ta açar. */
export function TermsLink({ onAccept, children = "şartlar ve koşulları" }: { onAccept?: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="font-semibold text-brand underline" onClick={(e) => { e.preventDefault(); setOpen(true); }}>{children}</button>
      <TermsModal open={open} onClose={() => setOpen(false)} onAccept={onAccept} />
    </>
  );
}
