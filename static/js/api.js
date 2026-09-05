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

export async function updateTransactionCategory(id, category) {
  const res = await fetch(`/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  return res.json();
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
