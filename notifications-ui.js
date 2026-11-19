
/* WF PUNDIT — RESPONSIVE NOTIFICATIONS */

(() => {
  "use strict";

  const style = document.createElement("style");

  style.textContent = `
    /* DASHBOARD MOBILE NAVIGATION */

    .topbar {
      gap: 8px;
      min-width: 0;
    }

    .topbar .brand {
      flex-shrink: 0;
      white-space: nowrap;
    }

    .topbar .nav {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: nowrap;
      gap: 6px;
      min-width: 0;
    }

    .topbar .nav a,
    .topbar .nav button {
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* NOTIFICATION BUTTON */

    .wf-notification-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }

    .wf-notification-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 38px;
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel2);
      color: var(--text);
      font-size: 12px;
      font-weight: 850;
      cursor: pointer;
      transition: background .2s, border-color .2s, transform .2s;
    }

    .wf-notification-button:hover {
      border-color: var(--blue);
      transform: translateY(-1px);
    }

    .wf-notification-button svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
    }

    .wf-notification-label {
      display: inline;
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
      color: #fff;
      font-size: 10px;
      font-weight: 900;
    }

    /* NOTIFICATION PANEL */

    .wf-notification-panel {
      position: absolute;
      z-index: 9999;
      top: calc(100% + 12px);
      right: 0;
      width: min(380px, calc(100vw - 24px));
      max-height: 470px;
      overflow-y: auto;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--panel);
      color: var(--text);
      box-shadow: 0 18px 50px #0005;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: wfNotificationOpen .18s ease-out;
    }

    @keyframes wfNotificationOpen {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .wf-notification-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 13px;
      border-bottom: 1px solid var(--line);
    }

    .wf-notification-heading h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -.3px;
    }

    .wf-notification-subtitle {
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
    }

    .wf-notification-mark-all {
      padding: 7px 9px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--panel2);
      color: var(--cyan);
      font-size: 10px;
      font-weight: 850;
      white-space: nowrap;
      cursor: pointer;
    }

    .wf-notification-mark-all:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .wf-notification-list {
      display: grid;
      gap: 9px;
      padding-top: 12px;
    }

    /* NOTIFICATION CARDS */

    .wf-notification-item {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 12px;
      border: 1px solid var(--line);
      border-radius: 11px;
      background: var(--panel2);
      color: var(--text);
      text-decoration: none;
      transition: border-color .2s, background .2s;
    }

    .wf-notification-item:hover {
      border-color: var(--blue);
    }

    .wf-notification-item.unread {
      border-left: 3px solid var(--blue);
      background: var(--panel2);
    }

    .wf-notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 34px;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--panel);
      color: var(--cyan);
    }

    .wf-notification-icon svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .wf-notification-content {
      flex: 1;
      min-width: 0;
    }

    .wf-notification-item strong {
      display: block;
      margin: 0 0 5px;
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .wf-notification-item p {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .wf-notification-item time {
      display: block;
      margin-top: 7px;
      color: var(--muted);
      font-size: 10px;
    }

    .wf-notification-new {
      display: inline-block;
      margin-top: 6px;
      color: var(--cyan);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .8px;
      text-transform: uppercase;
    }

    /* EMPTY AND ERROR STATES */

    .wf-notification-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 12px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
      text-align: center;
    }

    .wf-notification-empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 43px;
      height: 43px;
      margin-bottom: 11px;
      border-radius: 50%;
      background: var(--panel2);
      color: var(--cyan);
    }

    .wf-notification-empty-icon svg {
      width: 21px;
      height: 21px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .wf-notification-error {
      color: #e58a98;
    }

    /* MOBILE */

    @media (max-width: 480px) {
      .topbar {
        min-height: 58px;
        padding: 7px 10px;
        gap: 5px;
      }

      .topbar .brand {
        font-size: 15px;
        letter-spacing: -.6px;
      }

      .topbar .nav {
        gap: 4px;
      }

      .topbar .nav a,
      .topbar .nav button {
        padding: 6px 6px;
        border-radius: 7px;
        font-size: 8px;
        line-height: 1.2;
      }

      .wf-notification-button {
        min-height: 29px;
        gap: 3px;
        padding: 5px 7px;
        font-size: 9px;
      }

      .wf-notification-button svg {
        width: 15px;
        height: 15px;
      }

      .wf-notification-label {
        display: none;
      }

      .wf-notification-count {
        min-width: 15px;
        height: 15px;
        padding: 0 4px;
        font-size: 9px;
      }

      .wf-notification-panel {
        position: fixed;
        top: 65px;
        right: 10px;
        width: calc(100vw - 20px);
        max-width: 380px;
        max-height: calc(100dvh - 82px);
        padding: 13px;
        border-radius: 14px;
      }

      .wf-notification-heading h3 {
        font-size: 15px;
      }

      .wf-notification-item {
        padding: 11px 10px;
      }
    }

    @media (max-width: 350px) {
      .topbar {
        padding-left: 7px;
        padding-right: 7px;
        gap: 3px;
      }

      .topbar .brand {
        font-size: 13px;
      }

      .topbar .nav {
        gap: 3px;
      }

      .topbar .nav a,
      .topbar .nav button {
        padding: 5px 4px;
        font-size: 7px;
      }

      .wf-notification-button {
        padding: 5px;
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
  button.setAttribute("aria-controls", "wfNotificationPanel");

  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
      <path d="M10 21h4"></path>
    </svg>
    <span class="wf-notification-label">Alerts</span>
    <span class="wf-notification-count" hidden>0</span>
  `;

  const panel = document.createElement("section");
  panel.id = "wfNotificationPanel";
  panel.className = "wf-notification-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Notifications");

  panel.innerHTML = `
    <div class="wf-notification-heading">
      <div>
        <h3>Notifications</h3>
        <div class="wf-notification-subtitle">
          Your latest WF Pundit updates
        </div>
      </div>

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

    button.setAttribute(
      "aria-label",
      amount > 0
        ? amount + " unread notifications"
        : "Notifications"
    );
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

    const icon = document.createElement("div");
    icon.className = "wf-notification-empty-icon";

    icon.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
        <path d="M10 21h4"></path>
      </svg>
    `;

    const text = document.createElement("div");
    text.textContent = message;

    item.append(icon, text);
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

      const icon = document.createElement("div");
      icon.className = "wf-notification-icon";

      icon.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v14H4z"></path>
          <path d="m4 7 8 6 8-6"></path>
        </svg>
      `;

      const content = document.createElement("div");
      content.className = "wf-notification-content";

      const title = document.createElement("strong");
      title.textContent = notification.title || "New story";

      const message = document.createElement("p");
      message.textContent = notification.message || "";

      const date = document.createElement("time");
      date.textContent = formatDate(notification.created_at);

      content.append(title, message, date);

      if (!notification.read_at) {
        const newLabel = document.createElement("span");
        newLabel.className = "wf-notification-new";
        newLabel.textContent = "NEW";
        content.appendChild(newLabel);
      }

      link.append(icon, content);

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

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  loadNotifications();

  window.setInterval(loadNotifications, 60000);
})();
