// Dashboard "Budgets" panel: a monthly spending limit per category, shown
// as a progress bar against what's actually been spent in that category
// this month (see app/analytics.py: compute_budget_status).
import { getBudgets, setBudget, deleteBudget } from "./api.js";
import { formatINR } from "./categories.js";

// Categories a budget can be set for -- deliberately excludes "Income",
// since a budget caps spending and it doesn't make sense to cap what comes in.
const BUDGETABLE_CATEGORIES = [
  "Subscriptions",
  "Food & Groceries",
  "Transport",
  "Health & Fitness",
  "Bills & Utilities",
  "Other",
];

// Kept in sync with the last render so the edit form can be pre-filled from
// memory and so save() knows which categories currently have a budget (and
// therefore need a DELETE rather than nothing, when a field is cleared).
let currentBudgets = [];

function statusKey(percentage) {
  if (percentage >= 100) return "over";
  if (percentage >= 80) return "warning";
  return "ok";
}

export async function loadBudgets() {
  const container = document.getElementById("budgets-list");
  if (!container) return;

  currentBudgets = await getBudgets();

  if (currentBudgets.length === 0) {
    container.innerHTML =
      '<p class="muted">No budgets set yet. Set a monthly limit per category to see how your spending compares.</p>';
    return;
  }

  container.innerHTML = currentBudgets
    .map((b) => {
      const key = statusKey(b.percentage);
      const barWidth = Math.min(b.percentage, 100);
      return `
        <div class="budget-row">
          <div class="budget-row-header">
            <span class="budget-category">${b.category}</span>
            <span class="budget-amounts budget-text-${key}">${formatINR(b.spent, 0)} of ${formatINR(b.monthly_limit, 0)}</span>
          </div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill budget-fill-${key}" style="width:${barWidth}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function openBudgetModal() {
  const modal = document.getElementById("budget-form-section");
  if (!modal) return;

  document.querySelectorAll("#budget-form input[data-category]").forEach((input) => {
    const existing = currentBudgets.find((b) => b.category === input.dataset.category);
    input.value = existing ? existing.monthly_limit : "";
  });

  modal.classList.remove("hidden");
}

function closeBudgetModal() {
  document.getElementById("budget-form-section").classList.add("hidden");
}

export function initBudgets() {
  const editBtn = document.getElementById("edit-budgets-btn");
  const modal = document.getElementById("budget-form-section");
  if (!editBtn || !modal) return;

  editBtn.addEventListener("click", openBudgetModal);
  document.getElementById("close-budget-form-btn").addEventListener("click", closeBudgetModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBudgetModal();
  });

  document.getElementById("budget-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const writes = BUDGETABLE_CATEGORIES.map((category) => {
      const input = document.querySelector(`#budget-form input[data-category="${category}"]`);
      const value = parseFloat(input.value);
      const hadBudget = currentBudgets.some((b) => b.category === category);

      if (!isNaN(value) && value > 0) {
        return setBudget(category, value);
      } else if (hadBudget) {
        return deleteBudget(category);
      }
      return Promise.resolve();
    });

    await Promise.all(writes);
    closeBudgetModal();
    document.dispatchEvent(new CustomEvent("transactions:changed"));
  });
}
