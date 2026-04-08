export type SupportedCurrency = {
  code: string;
  label: string;
  locale: string;
};

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "EUR", label: "Euro", locale: "en-IE" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "AUD", label: "Australian Dollar", locale: "en-AU" },
  { code: "JPY", label: "Japanese Yen", locale: "ja-JP" },
];

export const BASE_CURRENCY = "USD";
