import { getOverview } from "./api.js";
import { formatINR } from "./categories.js";

export async function loadSummary() {
  const data = await getOverview();
  document.getElementById("total-income").textContent = formatINR(data.total_income, 0);
  document.getElementById("total-expenses").textContent = formatINR(data.total_expenses, 0);
  document.getElementById("balance").textContent = formatINR(data.balance, 0);
}
