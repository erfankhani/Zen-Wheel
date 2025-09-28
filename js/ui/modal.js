export function openModal(el) {
  const p = el.querySelector("[class*=modal-enter]");
  el.classList.remove("hidden");
  p.classList.remove("modal-leave", "modal-leave-active");
  p.classList.add("modal-enter");
  requestAnimationFrame(() => p.classList.add("modal-enter-active"));
}
export function closeModal(el) {
  const p = el.querySelector(
    "[class*=modal-enter],#connectPanel,#accountPanel"
  );
  p.classList.remove("modal-enter", "modal-enter-active");
  p.classList.add("modal-leave");
  requestAnimationFrame(() => {
    p.classList.add("modal-leave-active");
    setTimeout(() => {
      el.classList.add("hidden");
      p.classList.remove("modal-leave", "modal-leave-active");
    }, 150);
  });
}
