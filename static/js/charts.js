import { getCategorySummary, getAnalytics } from "./api.js";
import { categoryMeta } from "./categories.js";

let chartInstance = null;
let trendChartInstance = null;

// Bar chart of spending by category — used on the Dashboard page.
export async function loadCategoryChart() {
  const data = await getCategorySummary();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([name]) => name);
  const values = entries.map(([, amount]) => amount);
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((l) => categoryMeta(l).color),
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } },
      },
    },
  });
}

// Monthly spending line — used on the Reports page.
export async function loadTrendChart() {
  const data = await getAnalytics();
  const ctx = document.getElementById("trendChart").getContext("2d");
  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(data.monthly_trend),
      datasets: [
        {
          label: "Monthly Spending",
          data: Object.values(data.monthly_trend),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#4f46e5",
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
