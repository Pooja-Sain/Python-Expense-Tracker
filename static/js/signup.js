import { getCurrentUser } from "./auth.js";

// If already logged in, skip straight to the dashboard.
getCurrentUser().then((user) => {
  if (user) window.location.href = "/dashboard";
});

const form = document.getElementById("signup-form");
const errorEl = document.getElementById("auth-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    errorEl.textContent = "Passwords don't match.";
    errorEl.classList.remove("hidden");
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = "Password must be at least 6 characters.";
    errorEl.classList.remove("hidden");
    return;
  }

  const res = await fetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    errorEl.textContent = body.detail || "Something went wrong. Please try again.";
    errorEl.classList.remove("hidden");
    return;
  }

  window.location.href = "/dashboard";
});
