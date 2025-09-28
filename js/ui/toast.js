import { $ } from "../utils/dom.js";

export function toast(
  message,
  {
    title = "Notice",
    type = "info",
    timeout = 5000,
    actionLabel,
    onAction,
  } = {}
) {
  const wrap = $("toasts");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  const iconEmoji = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";
  t.innerHTML = `
    <div class="icon" aria-hidden="true">${iconEmoji}</div>
    <div style="z-index:1">
      <div class="title">${title}</div>
      <div class="msg">${message}</div>
    </div>
    ${
      actionLabel
        ? `<button class="text-slate-300 btn-ghost" style="z-index:1">${actionLabel}</button>`
        : ""
    }
    <button aria-label="Close" class="text-slate-300" style="z-index:1">✕</button>
    <div class="progress" style="animation-duration:${timeout}ms"></div>
  `;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));

  const close = () => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 200);
  };
  const btns = t.querySelectorAll("button");
  if (actionLabel && onAction)
    btns[0].addEventListener("click", () => {
      onAction();
      close();
    });
  btns[btns.length - 1].addEventListener("click", close);
  if (timeout) setTimeout(close, timeout);
}
