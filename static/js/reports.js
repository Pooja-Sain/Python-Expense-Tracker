// Reports page bootstrap.
import { getCategorySummary } from "./api.js";
import { initExpenseModal } from "./modal.js";
import { loadTrendChart } from "./charts.js";
import { categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

async function loadCategoryTable() {
  const data = await getCategorySummary();
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);

  const tbody = document.querySelector("#category-table tbody");
  tbody.innerHTML = "";

  rows.forEach(([name, amount]) => {
    const pct = total ? Math.round((amount / total) * 100) : 0;
    const meta = categoryMeta(name);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="dot" style="background:${meta.color}"></span>${name}</td>
      <td>${formatINR(amount, 0)}</td>
      <td>
        <span class="pct-bar"><span class="pct-fill" style="width:${pct}%;background:${meta.color}"></span></span>
        <span class="pct-label">${pct}%</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function refreshReports() {
  loadTrendChart();
  loadCategoryTable();
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  initExpenseModal();
  refreshReports();
  document.addEventListener("expense:added", refreshReports);
}

init();
