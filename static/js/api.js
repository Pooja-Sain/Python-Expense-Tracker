export async function getTransactions() {
  const res = await fetch("/transactions");
  return res.json();
}

export async function createTransaction(data) {
  const res = await fetch("/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTransaction(id, data) {
  const res = await fetch(`/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(result.detail || "Update failed");
  }
  return result;
}

export async function updateTransactionCategory(id, category) {
  return updateTransaction(id, { category });
}

export async function deleteTransaction(id) {
  const res = await fetch(`/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    throw new Error(result.detail || "Delete failed");
  }
  return res.json().catch(() => ({}));
}

export async function getCategorySummary() {
  const res = await fetch("/summary/category");
  return res.json();
}

export async function getOverview() {
  const res = await fetch("/summary/overview");
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch("/summary/analytics");
  return res.json();
}

export async function getMonthlySummary() {
  const res = await fetch("/summary/monthly");
  return res.json();
}

export async function getRecurringPayments() {
  const res = await fetch("/summary/recurring");
  return res.json();
}

export async function getBudgets() {
  const res = await fetch("/budgets");
  return res.json();
}

export async function setBudget(category, monthlyLimit) {
  const res = await fetch(`/budgets/${encodeURIComponent(category)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthly_limit: monthlyLimit }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(result.detail || "Couldn't save that budget");
  }
  return result;
}

export async function deleteBudget(category) {
  const res = await fetch(`/budgets/${encodeURIComponent(category)}`, { method: "DELETE" });
  // A 404 here just means there was nothing set for this category yet --
  // harmless when the caller is clearing a field that was already empty.
  if (!res.ok && res.status !== 404) {
    const result = await res.json().catch(() => ({}));
    throw new Error(result.detail || "Couldn't remove that budget");
  }
  return res.json().catch(() => ({}));
}

export async function importTransactionsCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/transactions/import", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Import failed");
  }
  return data;
}
