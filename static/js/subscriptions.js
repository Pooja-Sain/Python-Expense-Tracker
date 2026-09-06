// Subscriptions page bootstrap.
// Backed by real frequency-based detection on the server (app/analytics.py):
// any expense that repeats with the same description + amount roughly every
// month is flagged as recurring, regardless of what category it was filed
// under — so a gym membership under Health & Fitness or rent under Bills &
// Utilities shows up here too, not just things manually tagged "Subscriptions".
import { getRecurringPayments } from "./api.js";
import { initExpenseModal } from "./modal.js";
import { categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

export async function loadSubscriptions() {
  const list = await getRecurringPayments();
  const monthlyEstimate = list.reduce((sum, g) => sum + g.amount, 0);
  const meta = categoryMeta("Subscriptions");

  document.getElementById("subs-monthly-total").textContent = formatINR(monthlyEstimate, 0);
  document.getElementById("subs-count").textContent = list.length;

  const container = document.getElementById("subs-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML =
      '<p class="muted">No recurring payments detected yet. Once an expense repeats roughly monthly (same description and amount), it\'ll show up here automatically.</p>';
    return;
  }

  list.forEach((g) => {
    const card = document.createElement("div");
    card.className = "sub-card";
    card.innerHTML = `
      <div class="sub-icon" style="background:${meta.color}1a;color:${meta.color}">${meta.icon}</div>
      <div class="sub-info">
        <p class="sub-name">${g.description}</p>
        <p class="sub-meta">${g.occurrences} charges logged · every ~${g.average_interval_days} days · last on ${g.last_date}</p>
      </div>
      <div class="sub-right">
        <p class="sub-amount">${formatINR(g.amount, 0)}<span>/mo</span></p>
        <p class="sub-next">Next expected: ${g.next_expected_date}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  initExpenseModal();
  loadSubscriptions();
  document.addEventListener("transactions:changed", loadSubscriptions);
}

init();
