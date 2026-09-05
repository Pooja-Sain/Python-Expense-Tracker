// Transactions page bootstrap.
import { getTransactions, updateTransactionCategory, importTransactionsCSV } from "./api.js";
import { initExpenseModal } from "./modal.js";
import { categoryNames, categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

export async function loadTransactions() {
  const tbody = document.querySelector("#transactions-table tbody");
  // Show a visible loading state right away instead of leaving the table
  // blank while the request is in flight -- on a slow connection or right
  // after a big CSV import, that empty gap can look frozen.
  tbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="4"><span class="spinner"></span> Loading transactions…</td>
    </tr>
  `;
  document.getElementById("tx-count").textContent = "Loading…";

  const data = await getTransactions();
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
      loadTransactions();
      document.dispatchEvent(new CustomEvent("expense:added"));
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
  initCsvImport();
  loadTransactions();
  document.addEventListener("expense:added", loadTransactions);
}

init();
