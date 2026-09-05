import { getCurrentUser } from "./auth.js";

getCurrentUser().then((user) => {
  if (!user) return;
  document.querySelectorAll("[data-cta]").forEach((el) => {
    el.textContent = "Go to Dashboard";
    el.setAttribute("href", "/dashboard");
  });
  const loginLink = document.getElementById("nav-login");
  if (loginLink) loginLink.classList.add("hidden");
});
