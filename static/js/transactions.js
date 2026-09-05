// Transactions page bootstrap.
import { getTransactions, updateTransactionCategory } from "./api.js";
import { initExpenseModal } from "./modal.js";
import { categoryNames, categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

export async function loadTransactions() {
  const data = await getTransactions();
  const tbody = document.querySelector("#transactions-table tbody");
  tbody.innerHTML = "";

  data
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((t) => {
      const row = document.createElement("tr");
      const options = categoryNames()
        .map(
          (c) =>
            `<option value="${c}" ${c === t.category ? "selected" : ""}>${c}</option>`,
        )
        .join("");
      const meta = categoryMeta(t.category);
      row.innerHTML = `
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td class="${t.amount < 0 ? "expense" : "income"}">${formatINR(Math.abs(t.amount))}</td>
            <td>
              <select
                class="category-select"
                data-id="${t.id}"
                style="background:${meta.color}1a;color:${meta.color};border-color:${meta.color}66"
              >${options}</select>
            </td>
        `;
      tbody.appendChild(row);
    });

  document.getElementById("tx-count").textContent = `${data.length} transaction${data.length === 1 ? "" : "s"}`;

  tbody.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      await updateTransactionCategory(e.target.dataset.id, e.target.value);
      loadTransactions();
    });
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  initExpenseModal();
  loadTransactions();
  document.addEventListener("expense:added", loadTransactions);
}

init();
