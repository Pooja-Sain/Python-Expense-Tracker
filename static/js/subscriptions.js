// Subscriptions page bootstrap.
// There's no backend "recurring payment" detector yet — this groups
// transactions already tagged as the "Subscriptions" category by their
// description, which is a reasonable stand-in until real frequency-based
// detection is built into the API.
import { getTransactions } from "./api.js";
import { initExpenseModal } from "./modal.js";
import { categoryMeta, formatINR } from "./categories.js";
import { requireAuth } from "./auth.js";

export async function loadSubscriptions() {
  const data = await getTransactions();
  const subs = data.filter((t) => t.category === "Subscriptions" && t.amount < 0);

  const groups = {};
  subs.forEach((t) => {
    const key = t.description;
    if (!groups[key]) {
      groups[key] = {
        description: key,
        total: 0,
        count: 0,
        lastDate: t.date,
        lastAmount: Math.abs(t.amount),
      };
    }
    const g = groups[key];
    g.total += Math.abs(t.amount);
    g.count += 1;
    if (t.date >= g.lastDate) {
      g.lastDate = t.date;
      g.lastAmount = Math.abs(t.amount);
    }
  });

  const list = Object.values(groups).sort((a, b) => b.lastAmount - a.lastAmount);
  const monthlyEstimate = list.reduce((sum, g) => sum + g.lastAmount, 0);
  const meta = categoryMeta("Subscriptions");

  document.getElementById("subs-monthly-total").textContent = formatINR(monthlyEstimate, 0);
  document.getElementById("subs-count").textContent = list.length;

  const container = document.getElementById("subs-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML =
      '<p class="muted">No subscriptions detected yet. Tag an expense as "Subscriptions" to see it tracked here.</p>';
    return;
  }

  list.forEach((g) => {
    const card = document.createElement("div");
    card.className = "sub-card";
    card.innerHTML = `
      <div class="sub-icon" style="background:${meta.color}1a;color:${meta.color}">${meta.icon}</div>
      <div class="sub-info">
        <p class="sub-name">${g.description}</p>
        <p class="sub-meta">${g.count} charge${g.count > 1 ? "s" : ""} logged · last on ${g.lastDate}</p>
      </div>
      <p class="sub-amount">${formatINR(g.lastAmount, 0)}<span>/mo</span></p>
    `;
    container.appendChild(card);
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  initExpenseModal();
  loadSubscriptions();
  document.addEventListener("expense:added", loadSubscriptions);
}

init();
