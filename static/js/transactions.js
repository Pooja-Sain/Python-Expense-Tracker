// Transactions page bootstrap.
import {
  getTransactions,
  updateTransactionCategory,
  updateTransaction,
  deleteTransaction,
  importTransactionsCSV,
} from "./api.js";
import { initExpenseModal } from "./modal.js";
import { categoryNames, categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

// Kept in sync with the last render so the Edit modal can be pre-filled
// instantly from memory instead of firing another request just to look up
// one row's current values.
let cachedTransactions = [];
let editingId = null;

export async function loadTransactions() {
  const tbody = document.querySelector("#transactions-table tbody");
  // Show a visible loading state right away instead of leaving the table
  // blank while the request is in flight -- on a slow connection or right
  // after a big CSV import, that empty gap can look frozen.
  tbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="5"><span class="spinner"></span> Loading transactions…</td>
    </tr>
  `;
  document.getElementById("tx-count").textContent = "Loading…";

  const data = await getTransactions();
  cachedTransactions = data;
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
            <td class="row-actions">
              <button class="btn-icon edit-tx-btn" data-id="${t.id}" type="button" title="Edit transaction" aria-label="Edit transaction">✏️</button>
              <button class="btn-icon delete-tx-btn" data-id="${t.id}" type="button" title="Delete transaction" aria-label="Delete transaction">🗑️</button>
            </td>
        `;
      tbody.appendChild(row);
    });

  document.getElementById("tx-count").textContent = `${data.length} transaction${data.length === 1 ? "" : "s"}`;

  tbody.querySelectorAll(".category-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      await updateTransactionCategory(e.target.dataset.id, e.target.value);
      document.dispatchEvent(new CustomEvent("transactions:changed"));
    });
  });

  tbody.querySelectorAll(".edit-tx-btn").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.id));
  });

  tbody.querySelectorAll(".delete-tx-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id));
  });
}

// --- Edit modal: fixes a wrongly-entered date, description or amount ---
// (the category dropdown above already handles a quick recategorize on its
// own, without opening this).

function openEditModal(id) {
  const t = cachedTransactions.find((tx) => String(tx.id) === String(id));
  if (!t) return;
  editingId = t.id;

  document.getElementById("edit-date").value = t.date;
  document.getElementById("edit-description").value = t.description;
  document.getElementById("edit-amount").value = Math.abs(t.amount);
  document.getElementById("edit-category").value = t.category;
  const typeInput = document.querySelector(
    `input[name="edit-type"][value="${t.amount < 0 ? "debit" : "credit"}"]`,
  );
  if (typeInput) typeInput.checked = true;

  document.getElementById("edit-expense-form-section").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("edit-expense-form-section").classList.add("hidden");
  editingId = null;
}

function initEditModal() {
  const modal = document.getElementById("edit-expense-form-section");
  if (!modal) return;

  document.getElementById("close-edit-form-btn").addEventListener("click", closeEditModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeEditModal();
  });

  document.getElementById("edit-expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (editingId == null) return;

    const rawAmount = Math.abs(parseFloat(document.getElementById("edit-amount").value));
    const type = document.querySelector('input[name="edit-type"]:checked').value;
    const signedAmount = type === "debit" ? -rawAmount : rawAmount;

    await updateTransaction(editingId, {
      date: document.getElementById("edit-date").value,
      description: document.getElementById("edit-description").value,
      amount: signedAmount,
      category: document.getElementById("edit-category").value,
    });

    closeEditModal();
    document.dispatchEvent(new CustomEvent("transactions:changed"));
  });
}

// --- Delete ---

async function handleDelete(id) {
  const t = cachedTransactions.find((tx) => String(tx.id) === String(id));
  const label = t ? `"${t.description}" from ${t.date}` : "this transaction";
  if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;

  await deleteTransaction(id);
  document.dispatchEvent(new CustomEvent("transactions:changed"));
}

// --- CSV import ---

function showImportStatus(message, isError = false, isLoading = false) {
  const el = document.getElementById("import-status");
  el.innerHTML = isLoading ? `<span class="spinner"></span> ${message}` : message;
  el.classList.remove("hidden", "import-status-error", "import-status-ok", "import-status-loading");
  el.classList.add(isLoading ? "import-status-loading" : isError ? "import-status-error" : "import-status-ok");
}

function initCsvImport() {
  const input = document.getElementById("csv-file-input");
  const label = document.querySelector('label[for="csv-file-input"]');
  if (!input) return;

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    // Feedback appears the instant a file is picked, not just once the
    // upload finishes -- a large CSV can take a few seconds to process
    // (every row is checked against existing transactions to skip
    // duplicates), so without this the button just looks unresponsive.
    showImportStatus(`Importing ${file.name}…`, false, true);
    input.disabled = true;
    if (label) label.classList.add("btn-disabled");

    try {
      const result = await importTransactionsCSV(file);
      const parts = [`${result.imported} imported`];
      if (result.skipped_duplicates) parts.push(`${result.skipped_duplicates} duplicate${result.skipped_duplicates === 1 ? "" : "s"} skipped`);
      if (result.skipped_invalid) parts.push(`${result.skipped_invalid} row${result.skipped_invalid === 1 ? "" : "s"} skipped (couldn't be read)`);
      showImportStatus(`Import complete — ${parts.join(", ")}.`);
      document.dispatchEvent(new CustomEvent("transactions:changed"));
    } catch (err) {
      showImportStatus(err.message || "Import failed.", true);
    } finally {
      input.value = "";
      input.disabled = false;
      if (label) label.classList.remove("btn-disabled");
    }
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  initExpenseModal();
  initEditModal();
  initCsvImport();
  loadTransactions();
  document.addEventListener("transactions:changed", loadTransactions);
}

init();
