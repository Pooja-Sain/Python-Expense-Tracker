// Dashboard page bootstrap.
import { initExpenseModal } from "./modal.js";
import { loadSummary } from "./summary.js";
import { loadCategoryChart } from "./charts.js";
import { loadInsights } from "./insights.js";

function refreshDashboard() {
  loadSummary();
  loadCategoryChart();
  loadInsights();
}

initExpenseModal();
refreshDashboard();
document.addEventListener("expense:added", refreshDashboard);
