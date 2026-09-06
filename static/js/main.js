// Dashboard page bootstrap.
import { initExpenseModal } from "./modal.js";
import { loadSummary, loadMonthlySummary } from "./summary.js";
import { loadCategoryChart } from "./charts.js";
import { loadInsights } from "./insights.js";
import { loadBudgets, initBudgets } from "./budgets.js";
import { requireAuth } from "./auth.js";

function refreshDashboard() {
  loadSummary();
  loadMonthlySummary();
  loadCategoryChart();
  loadInsights();
  loadBudgets();
}

async function init() {
  const user = await requireAuth();
  if (!user) return; // requireAuth already redirected to /login

  initExpenseModal();
  initBudgets();
  refreshDashboard();
  document.addEventListener("transactions:changed", refreshDashboard);
}

init();
