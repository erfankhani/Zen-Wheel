import { $ } from "../utils/dom.js";
import { formatZTC, shortHash } from "../utils/format.js";
import { EXPLORER_URL } from "../config.js";

export const MAX_STATUS = 50; // optional local override

export function addStatus({ title, html, tone = "info" }) {
  const list = $("logList");
  const item = document.createElement("div");
  item.className = "status-item";
  const color =
    tone === "success"
      ? "var(--ok)"
      : tone === "error"
      ? "var(--danger)"
      : "var(--indigo)";
  item.innerHTML = `
    <div class="w-2 h-2 mt-2 rounded-full" style="background:${color}"></div>
    <div class="flex-1">
      <div class="status-title">${title}</div>
      <div class="status-msg">${html}</div>
    </div>`;
  list.insertBefore(item, list.firstChild);
  while (list.children.length > MAX_STATUS) list.lastChild?.remove();
  return item;
}

export function addTxStatus(hash) {
  const list = $("logList");
  const item = document.createElement("div");
  item.className = "status-item";
  const s = shortHash(hash);
  item.innerHTML = `
    <div class="w-2 h-2 mt-2 rounded-full" style="background:var(--indigo)"></div>
    <div class="flex-1">
      <div class="status-title">Transaction submitted</div>
      <div class="status-msg mono">
        <span class="khaki">${s}</span>
        <div class="mt-2 flex gap-2">
          <button class="btn-ghost text-xs" data-copy>Copy</button>
          <a class="btn-ghost text-xs" href="${EXPLORER_URL}/tx/${hash}" target="_blank" rel="noreferrer">Explorer</a>
        </div>
      </div>
    </div>`;
  item.querySelector("[data-copy]")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(hash);
  });
  list.insertBefore(item, list.firstChild);
  while (list.children.length > MAX_STATUS) list.lastChild?.remove();
  return item;
}

export function markTxConfirmed(item, { gasCostWei } = {}) {
  if (!item) return;
  item.querySelector(".status-title").textContent = "Confirmed";
  item.querySelector(".w-2").style.background = "var(--ok)";
  if (gasCostWei) {
    const msg = item.querySelector(".status-msg");
    const p = document.createElement("div");
    p.className = "mt-1";
    p.textContent = "Fee: " + formatZTC(gasCostWei);
    msg.appendChild(p);
  }
}
