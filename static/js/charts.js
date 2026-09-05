import { getCategorySummary, getAnalytics } from "./api.js";
import { categoryMeta } from "./categories.js";

let chartInstance = null;
let trendChartInstance = null;
let incomeExpenseChartInstance = null;
let categoryPieChartInstance = null;

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
      responsive: true,
      maintainAspectRatio: false,
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
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Grouped monthly Income vs Expenses bars — used on the Reports page.
// monthly_trend (expenses) and monthly_income don't necessarily cover the
// same set of months (e.g. a month with a salary deposit but no logged
// expenses yet), so the label set is the union of both, sorted
// chronologically, with 0 filled in wherever one side has no data.
export async function loadIncomeExpenseChart() {
  const data = await getAnalytics();
  const months = Array.from(
    new Set([...Object.keys(data.monthly_income), ...Object.keys(data.monthly_trend)]),
  ).sort();
  const incomeValues = months.map((m) => data.monthly_income[m] || 0);
  const expenseValues = months.map((m) => data.monthly_trend[m] || 0);

  const ctx = document.getElementById("incomeExpenseChart").getContext("2d");
  if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();
  incomeExpenseChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomeValues,
          backgroundColor: "#059669",
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: "Expenses",
          data: expenseValues,
          backgroundColor: "#ef4444",
          borderRadius: 6,
          maxBarThickness: 32,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "top", align: "end" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Category breakdown doughnut — a visual companion to the category table,
// used on the Reports page.
export async function loadCategoryPieChart() {
  const data = await getCategorySummary();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([name]) => name);
  const values = entries.map(([, amount]) => amount);

  const ctx = document.getElementById("categoryPieChart").getContext("2d");
  if (categoryPieChartInstance) categoryPieChartInstance.destroy();
  categoryPieChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((l) => categoryMeta(l).color),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "right", labels: { boxWidth: 12, padding: 12 } } },
    },
  });
}
