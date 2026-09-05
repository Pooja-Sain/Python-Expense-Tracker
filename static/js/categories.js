export const categories = [
  { name: "Subscriptions", color: "#8b5cf6", icon: "🎬" },
  { name: "Food & Groceries", color: "#f59e0b", icon: "🍽️" },
  { name: "Transport", color: "#3b82f6", icon: "🚗" },
  { name: "Health & Fitness", color: "#10b981", icon: "💪" },
  { name: "Income", color: "#059669", icon: "💵" },
  { name: "Bills & Utilities", color: "#ef4444", icon: "🧾" },
  { name: "Other", color: "#6b7280", icon: "📦" },
];

export function categoryNames() {
  return categories.map((c) => c.name);
}

export function categoryMeta(name) {
  return categories.find((c) => c.name === name) || categories[categories.length - 1];
}

export function formatINR(amount, decimals = 2) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
