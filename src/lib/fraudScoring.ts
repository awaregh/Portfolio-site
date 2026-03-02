const FEATURE_NAMES = ["amount_zscore", "time_cyclical", "frequency_1h", "pca_interaction", "velocity_ratio", "merchant_risk"];

export function scoreTxn(amount: number, time: number, category: string): { score: number; features: { name: string; impact: number }[] } {
  let score = 0.05;
  if (amount > 5000) score += 0.35;
  else if (amount > 2000) score += 0.2;
  else if (amount > 1000) score += 0.1;
  if (amount < 1) score += 0.15;
  const hour = (time / 3600) % 24;
  if (hour < 6 || hour > 22) score += 0.15;
  if (category === "wire_transfer") score += 0.12;
  else if (category === "atm_withdrawal") score += 0.06;
  score += (Math.random() - 0.5) * 0.08;
  score = Math.max(0.01, Math.min(0.99, score));

  const features = FEATURE_NAMES.map((name) => ({
    name,
    impact: parseFloat(((Math.random() - 0.4) * (name === "amount_zscore" && amount > 2000 ? 0.6 : 0.3)).toFixed(3)),
  })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return { score, features };
}

export const CATEGORIES = ["online_purchase", "atm_withdrawal", "wire_transfer", "pos_terminal", "recurring_payment"];

export const PRESETS: { label: string; amount: number; time: number; category: string }[] = [
  { label: "Normal purchase", amount: 42.5, time: 43200, category: "pos_terminal" },
  { label: "Large wire transfer", amount: 9800, time: 3600, category: "wire_transfer" },
  { label: "Late-night ATM", amount: 500, time: 82800, category: "atm_withdrawal" },
  { label: "Micro-transaction", amount: 0.99, time: 54000, category: "online_purchase" },
  { label: "Suspicious pattern", amount: 4999, time: 7200, category: "wire_transfer" },
];

export interface Transaction {
  id: string;
  amount: number;
  time: number;
  category: string;
  fraudScore: number;
  prediction: "fraud" | "legit";
  latencyMs: number;
  topFeatures: { name: string; impact: number }[];
}

export const FRAUD_THRESHOLD = 0.5;
