import { CHAIN_SYMBOL } from "../config.js";

export const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
export const toNum = (v) => Number(v);
export const shortHash = (h) => (h ? h.slice(0, 10) + "…" + h.slice(-8) : "");

export const formatZTC = (w) => {
  try {
    return ethers.formatEther(w) + " " + CHAIN_SYMBOL;
  } catch {
    return String(w);
  }
};

export async function copyToClipboard(text, successCb) {
  try {
    await navigator.clipboard.writeText(text);
    successCb?.();
  } catch {
    /* ignore */
  }
}
