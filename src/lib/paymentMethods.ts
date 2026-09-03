export const PAYMENT_METHOD_OPTIONS = [
  { key: "VENMO", label: "Venmo", placeholder: "@your-venmo" },
  { key: "ZELLE", label: "Zelle", placeholder: "phone or email" },
  { key: "CASHAPP", label: "Cash App", placeholder: "$your-cashtag" },
  { key: "PAYPAL", label: "PayPal", placeholder: "you@email.com" },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_OPTIONS)[number]["key"];
