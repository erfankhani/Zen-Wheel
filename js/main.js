import { $ } from "./utils/dom.js";
import { toast } from "./ui/toast.js";
import { openModal, closeModal } from "./ui/modal.js";
import { copyToClipboard } from "./utils/format.js";
import { ABI } from "./abi.js";
import { bootWheelOnce } from "./web3/game.js";
import { refreshStatics, spin } from "./web3/game.js";
import {
  connectWithInjected,
  refreshWalletPanels,
  disconnectSoft,
} from "./web3/wallet.js";

document.addEventListener("DOMContentLoaded", async () => {
  bootWheelOnce();
  refreshWalletPanels();
  // console.log("Test")
  // Buttons
  $("connectBtn").addEventListener("click", () => openModal($("connectModal")));
  $("accountPill").addEventListener("click", () => {
    const a = document.getElementById("accountShort")?.textContent;
    if (!a || a === "0x…") openModal($("connectModal"));
    else openModal($("accountModal"));
  });
  $("spinBtn").addEventListener("click", spin);
  $("clearStatus").addEventListener(
    "click",
    () => ($("logList").innerHTML = "")
  );

  // Modal close
  $("connectClose").addEventListener("click", () =>
    closeModal($("connectModal"))
  );
  $("connectModal").addEventListener("click", (e) => {
    if (e.target.id === "connectModal") closeModal($("connectModal"));
  });

  document
    .querySelectorAll(
      '#connectModal [data-wallet="metamask"], #connectModal [data-wallet="rabby"]'
    )
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await connectWithInjected(ABI);
          closeModal($("connectModal"));
          toast("Wallet connected successfully.", {
            title: "Connected",
            type: "success",
          });
          await refreshWalletPanels();
          await refreshStatics();
        } catch (err) {
          toast(err?.message || "Wallet not found.", {
            title: "Wallet error",
            type: "error",
          });
        }
      });
    });

  $("accountClose").addEventListener("click", () =>
    closeModal($("accountModal"))
  );
  $("accountModal").addEventListener("click", (e) => {
    if (e.target.id === "accountModal") closeModal($("accountModal"));
  });
  $("copyBtn").addEventListener("click", async () => {
    const addr = document
      .getElementById("accountShort")
      ?.textContent?.replace("…", ""); // just UX
    await copyToClipboard(addr, () =>
      toast("Copied", { title: "Copied", type: "success" })
    );
    const b = $("copyBtn");
    b.textContent = "Copied ✓";
    setTimeout(() => (b.textContent = "Copy Address"), 1000);
  });
  $("disconnectBtn").addEventListener("click", async () => {
    await disconnectSoft();
    closeModal($("accountModal"));
    toast("Disconnected from wallet.", { title: "Disconnected", type: "info" });
  });

  // programmatic open connect from game.js
  document.addEventListener("open-connect", () => openModal($("connectModal")));

  // initial reads
  await refreshStatics();
});
