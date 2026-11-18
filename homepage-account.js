
/* WF PUNDIT — HOMEPAGE READER SESSION */

let homepageAccountCheckInProgress = false;

async function updateHomepageAccount() {
  if (homepageAccountCheckInProgress) return;

  const containers = document.querySelectorAll(".account-actions");

  if (!containers.length) return;

  homepageAccountCheckInProgress = true;

  containers.forEach(container => {
    container.dataset.sessionState = "checking";

    if (!container.querySelector(".homepage-account-logged-out")) {
      container.innerHTML = `
        <div class="homepage-account-logged-out">
          <a class="account-link login" href="/account.html">LOG IN</a>
          <a class="account-link signup" href="/account.html?mode=register">SIGN UP</a>
        </div>

        <div class="homepage-account-logged-in" hidden>
          <span class="homepage-account-greeting">
            Hi, <strong class="homepage-reader-name">Reader</strong>
          </span>

          <a class="account-link signup" href="/dashboard.html">
            VIEW DASHBOARD
          </a>
        </div>
      `;
    }
  });

  try {
    const response = await fetch("/api/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to check reader session.");
    }

    const result = await response.json();

    const loggedIn = Boolean(
      result.success &&
      result.loggedIn &&
      result.user
    );

    const displayName = String(
      result.user?.displayName || "Reader"
    ).trim();

    const firstName = displayName.split(/\s+/)[0] || "Reader";

    containers.forEach(container => {
      const loggedOut = container.querySelector(
        ".homepage-account-logged-out"
      );

      const loggedInPanel = container.querySelector(
        ".homepage-account-logged-in"
      );

      const nameElement = container.querySelector(
        ".homepage-reader-name"
      );

      loggedOut.hidden = loggedIn;
      loggedInPanel.hidden = !loggedIn;

      if (loggedIn && nameElement) {
        nameElement.textContent = firstName;
      }

      container.dataset.sessionState = loggedIn
        ? "logged-in"
        : "logged-out";
    });

  } catch (error) {
    console.error("Homepage account check failed:", error);

    containers.forEach(container => {
      const loggedOut = container.querySelector(
        ".homepage-account-logged-out"
      );

      const loggedInPanel = container.querySelector(
        ".homepage-account-logged-in"
      );

      if (loggedOut) loggedOut.hidden = false;
      if (loggedInPanel) loggedInPanel.hidden = true;

      container.dataset.sessionState = "logged-out";
    });

  } finally {
    homepageAccountCheckInProgress = false;
  }
}

/* Run once when the homepage loads. */
document.addEventListener(
  "DOMContentLoaded",
  updateHomepageAccount,
  { once: true }
);

/* Recheck when returning from the browser's page cache. */
window.addEventListener("pageshow", event => {
  if (event.persisted) {
    updateHomepageAccount();
  }
});
