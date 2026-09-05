import { getOverview, getMonthlySummary } from "./api.js";
import { formatINR } from "./categories.js";

export async function loadSummary() {
  const data = await getOverview();
  document.getElementById("total-income").textContent = formatINR(data.total_income, 0);
  document.getElementById("total-expenses").textContent = formatINR(data.total_expenses, 0);
  document.getElementById("balance").textContent = formatINR(data.balance, 0);
}

// "This Month" cards -- separate from the all-time totals above, so
// spending can be checked against what was actually earned in the current
// calendar month rather than against income earned over the app's whole
// history.
export async function loadMonthlySummary() {
  const data = await getMonthlySummary();
  document.getElementById("month-income").textContent = formatINR(data.income, 0);
  document.getElementById("month-expenses").textContent = formatINR(data.expenses, 0);
  document.getElementById("month-balance").textContent = formatINR(data.balance, 0);

  const labelEl = document.getElementById("current-month-label");
  if (labelEl && data.month) {
    const [year, month] = data.month.split("-").map(Number);
    labelEl.textContent = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }
}
