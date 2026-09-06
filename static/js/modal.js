import { createTransaction } from "./api.js";

// Shared "Add Expense" modal, wired up on every page. On success it fires a
// "transactions:changed" event on `document` so each page can refresh its
// own view without every page needing to know about every other page's data.
// The same event is fired after an edit, delete, or CSV import (see
// transactions.js) since all of them mean "the transaction set changed"
// just as much as adding one does.
export function initExpenseModal() {
  const modal = document.getElementById("expense-form-section");
  if (!modal) return;

  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  document.getElementById("toggle-form-btn").addEventListener("click", openModal);
  document.getElementById("close-form-btn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document
    .getElementById("expense-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const rawAmount = Math.abs(
        parseFloat(document.getElementById("amount").value),
      );
      const type = document.querySelector('input[name="type"]:checked').value;
      const signedAmount = type === "debit" ? -rawAmount : rawAmount;

      const newExpense = {
        date: document.getElementById("date").value,
        description: document.getElementById("description").value,
        amount: signedAmount,
        category: document.getElementById("category").value,
      };

      await createTransaction(newExpense);
      document.getElementById("expense-form").reset();
      closeModal();
      document.dispatchEvent(new CustomEvent("transactions:changed"));
    });
}
