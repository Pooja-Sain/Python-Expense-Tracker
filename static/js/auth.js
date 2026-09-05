// Shared auth helpers used by every protected page (Dashboard, Transactions,
// Subscriptions, Reports) and by the landing/login/signup pages.

export async function getCurrentUser() {
  const res = await fetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}

// Call at the top of a protected page's bootstrap. Redirects to /login and
// returns null if nobody is logged in; otherwise returns {id, email} and
// fills in the "user-email" element + wires the "Log out" button, if present.
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/login";
    return null;
  }
  const emailEl = document.getElementById("user-email");
  if (emailEl) emailEl.textContent = user.email;
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  return user;
}

export async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
