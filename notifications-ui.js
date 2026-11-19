/* WF PUNDIT — IN-APP NOTIFICATIONS */

(() => {
  "use strict";

  const style = document.createElement("style");

  style.textContent = `
    .wf-notification-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .wf-notification-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 38px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel);
      color: var(--text);
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    .wf-notification-button svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .wf-notification-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 20px;
      background: #e04455;
      color: white;
      font-size: 10px;
      font-weight: 900;
    }

    .wf-notification-panel {
      position: absolute;
      z-index: 1000;
      top: calc(100% + 12px);
      right: 0;
      width: min(360px, calc(100vw - 28px));
      max-height: 470px;
      overflow-y: auto;
      padding: 15px;
      border: 1px solid var(--line);
      border-radius: 13px;
      background: var(--panel);
      color: var(--text);
      box-shadow: 0 15px 40px #0004;
    }

    .wf-notification-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 13px;
    }

    .wf-notification-heading h3 {
      margin: 0;
      font-size: 16px;
    }

    .wf-notification-mark-all {
      border: 0;
      background: transparent;
      color: var(--cyan);
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }

    .wf-notification-item {
      display: block;
      padding: 12px 10px;
      margin-top: 8px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel2);
      color: var(--text);
      text-decoration: none;
    }

    .wf-notification-item.unread {
      border-left: 3px solid var(--blue);
    }

    .wf-notification-item strong {
      display: block;
      margin-bottom: 5px;
      font-size: 13px;
    }

    .wf-notification-item p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .wf-notification-item time {
      display: block;
      margin-top: 7px;
      color: var(--muted);
      font-size: 10px;
    }

    .wf-notification-empty {
      padding: 22px 10px;
      color: var(--muted);
      font-size: 12px;
      text-align: center;
    }

    .wf-notification-error {
      color: #e58a98;
    }

    @media (max-width: 480px) {
      .wf-notification-button {
        min-height: 36px;
        padding: 7px 9px;
        font-size: 11px;
      }

      .wf-notification-panel {
        right: -65px;
      }
    }
  `;

  document.head.appendChild(style);

  const nav = document.querySelector(".topbar .nav");

  if (!nav) return;

  const wrap = document.createElement("div");
  wrap.className = "wf-notification-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wf-notification-button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Notifications");

  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
      <path d="M10 21h4"></path>
    </svg>
    <span>Alerts</span>
    <span class="wf-notification-count" hidden>0</span>
  `;

  const panel = document.createElement("div");
  panel.className = "wf-notification-panel";
  panel.hidden = true;

  panel.innerHTML = `
    <div class="wf-notification-heading">
      <h3>Notifications</h3>
      <button
        type="button"
        class="wf-notification-mark-all"
      >Mark all read</button>
    </div>
    <div class="wf-notification-list">
      <div class="wf-notification-empty">
        Loading notifications…
      </div>
    </div>
  `;

  wrap.append(button, panel);

  const themeButton = document.getElementById("themeButton");

  if (themeButton) {
    nav.insertBefore(wrap, themeButton);
  } else {
    nav.prepend(wrap);
  }

  const count = button.querySelector(".wf-notification-count");
  const list = panel.querySelector(".wf-notification-list");
  const markAllButton = panel.querySelector(
    ".wf-notification-mark-all"
  );

  let notifications = [];

  function showCount(total) {
    const amount = Number(total || 0);

    count.textContent = amount > 99 ? "99+" : String(amount);
    count.hidden = amount < 1;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Lagos"
    }).format(date);
  }

  function showEmpty(message, isError = false) {
    list.replaceChildren();

    const item = document.createElement("div");
    item.className = "wf-notification-empty";

    if (isError) {
      item.classList.add("wf-notification-error");
    }

    item.textContent = message;
    list.appendChild(item);
  }

  function safeArticleLink(value) {
    try {
      const url = new URL(value, window.location.origin);

      if (url.origin !== window.location.origin) {
        return "/";
      }

      return url.pathname + url.search + url.hash;
    } catch {
      return "/";
    }
  }

  function renderNotifications() {
    list.replaceChildren();

    if (!notifications.length) {
      showEmpty("You're all caught up. No notifications yet.");
      return;
    }

    notifications.forEach(notification => {
      const link = document.createElement("a");

      link.className = "wf-notification-item";

      if (!notification.read_at) {
        link.classList.add("unread");
      }

      link.href = safeArticleLink(notification.link);

      const title = document.createElement("strong");
      title.textContent = notification.title || "New story";

      const message = document.createElement("p");
      message.textContent = notification.message || "";

      const date = document.createElement("time");
      date.textContent = formatDate(notification.created_at);

      link.append(title, message, date);

      link.addEventListener("click", () => {
        if (!notification.read_at) {
          markRead(notification.id);
        }
      });

      list.appendChild(link);
    });
  }

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load notifications."
        );
      }

      notifications = data.notifications || [];

      showCount(data.unread_count);
      renderNotifications();

    } catch (error) {
      showEmpty(error.message, true);
    }
  }

  async function markRead(id) {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "mark_read",
          id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to update notification."
        );
      }

      await loadNotifications();

    } catch (error) {
      console.error("Notification update failed:", error);
    }
  }

  async function markAllRead() {
    markAllButton.disabled = true;

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "mark_all_read"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to update notifications."
        );
      }

      await loadNotifications();

    } catch (error) {
      alert(error.message);
    } finally {
      markAllButton.disabled = false;
    }
  }

  button.addEventListener("click", () => {
    const opening = panel.hidden;

    panel.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));

    if (opening) {
      loadNotifications();
    }
  });

  markAllButton.addEventListener("click", markAllRead);

  document.addEventListener("click", event => {
    if (!wrap.contains(event.target)) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  loadNotifications();

  // Refresh the unread count periodically while the dashboard is open.
  window.setInterval(loadNotifications, 60000);
})();
