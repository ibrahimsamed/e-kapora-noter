export const DEMO_CARD_HINTS = [
  { label: "✓ Başarılı kart", number: "4242424242424242" },
  { label: "✗ Reddedilen kart", number: "4000000000000002" },
  { label: "✗ Yetersiz bakiye", number: "4000000000009995" },
];

/** Havale / EFT ile ödeme için hesap bilgileri (ortam değişkeniyle değiştirilir; demo varsayılanları). */
export const BANK_INFO = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME || "Demo Bank",
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "e-kapora noter Ödeme Hizmetleri A.Ş.",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || "TR00 0000 0000 0000 0000 0000 00",
};
