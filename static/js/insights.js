import { getAnalytics, getTransactions } from "./api.js";
import { formatINR } from "./categories.js";

// Small "at a glance" stats shown on the Dashboard page.
export async function loadInsights() {
  const [analytics, txs] = await Promise.all([getAnalytics(), getTransactions()]);

  document.getElementById("top-category").textContent = analytics.top_category;
  document.getElementById("top-category-amount").textContent = formatINR(
    analytics.top_category_amount,
    0,
  );
  document.getElementById("biggest-expense").textContent =
    `${analytics.biggest_expense.description} (${formatINR(analytics.biggest_expense.amount, 0)})`;
  document.getElementById("quick-stats").textContent = `${txs.length}`;
}
