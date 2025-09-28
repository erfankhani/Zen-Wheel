import { ABI } from "../abi.js";
import { $ } from "../utils/dom.js";
import { formatZTC, toNum } from "../utils/format.js";
import { EXPLORER_URL } from "../config.js";
import { addStatus, addTxStatus, markTxConfirmed } from "../ui/status.js";
import { toast } from "../ui/toast.js";
import {
  ensureWheelDom,
  rebuildWheel,
  startFreeSpin,
  landOnValue,
  setWheelState,
} from "../wheel/wheel.js";
import { getWeb3, refreshWalletPanels } from "./wallet.js";

export async function refreshStatics() {
  const { contract, provider } = getWeb3();
  try {
    if (!contract || !provider) {
      rebuildWheel();
      return;
    }
    const [mb, he, wp, dp, table, bank] = await Promise.all([
      contract.minBet(),
      contract.houseEdgeBP(),
      contract.winPct(),
      contract.drawPct(),
      contract.getWinTable(),
      provider.getBalance(contract.target || contract.address),
    ]);

    const weightsRaw = table[0],
      multRaw = table[1];
    setWheelState({
      wp,
      dp,
      weights: Array.from(weightsRaw, toNum),
      mults: Array.from(multRaw, toNum),
    });
    rebuildWheel();

    $("info").textContent =
      `${formatZTC(mb)} | House edge: ${(toNum(he) / 100).toFixed(2)}% | ` +
      `Win multipliers: [${Array.from(multRaw, toNum)
        .map((m) => (m / 100).toFixed(m % 100 === 0 ? 0 : 1))
        .join(", ")}] | ` +
      `Distribution — Win ${toNum(wp)}% / Draw ${toNum(dp)}% / Lose ${Math.max(
        0,
        100 - toNum(wp) - toNum(dp)
      )}% | ` +
      `Bankroll: ${formatZTC(bank)}`;
  } catch (e) {
    addStatus({ title: "Read error", html: e?.message || e, tone: "error" });
    rebuildWheel();
  }
}

export async function spin() {
  const { contract, signer } = getWeb3();
  if (!contract) {
    document.dispatchEvent(new CustomEvent("open-connect"));
    return;
  }
  const amtStr = $("amount").value,
    n = Number(amtStr);
  if (!n || n <= 0) {
    toast("Enter a valid bet amount greater than 0.", {
      title: "Invalid amount",
      type: "error",
    });
    return;
  }
  if (n >= 1) {
    toast("Maximum bet is less than 1.0 ZTC.", {
      title: "Amount too high",
      type: "error",
    });
    return;
  }

  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const salt = BigInt(arr[0]) + (BigInt(Date.now()) << 32n);

  $("spinBtn").disabled = true;
  startFreeSpin();
  addStatus({
    title: "Sending transaction",
    html: `Betting <span class="mono">${amtStr} ZTC</span>`,
  });

  const tx = await contract.play(salt, { value: ethers.parseEther(amtStr) });
  const txItem = addTxStatus(tx.hash);
  toast("Transaction sent.", {
    title: "Tx Sent",
    type: "info",
    actionLabel: "Copy Hash",
    onAction: () => navigator.clipboard.writeText(tx.hash),
  });

  const rc = await tx.wait();
  if (rc?.gasUsed && rc?.effectiveGasPrice) {
    await refreshWalletPanels();
  }

  const iface = new ethers.Interface(ABI);
  let wheelVal = null,
    outcome = null,
    payout = 0n;
  for (const lg of rc.logs) {
    try {
      const p = iface.parseLog(lg);
      if (
        p?.name === "Played" &&
        String(p.args.player).toLowerCase() ===
          String(await signer.getAddress()).toLowerCase()
      ) {
        wheelVal = Number(p.args.wheel);
        outcome = Number(p.args.outcome);
        payout = BigInt(p.args.payout);
        break;
      }
    } catch {}
  }
  if (wheelVal === null) {
    $("spinBtn").disabled = false;
    addStatus({
      title: "Read error",
      html: "Played event not found.",
      tone: "error",
    });
    toast("Could not read result (Played event missing).", {
      title: "Read error",
      type: "error",
    });
    return;
  }

  markTxConfirmed(txItem, {});
  const suspenseMs = 1200 + Math.floor(Math.random() * 1500);
  setTimeout(() => {
    landOnValue(wheelVal);
    const onEnd = (e) => {
      if (e.propertyName === "transform") {
        document
          .getElementById("wheelSvg")
          .removeEventListener("transitionend", onEnd);
        const txt =
          outcome === 2 ? "Win ✅" : outcome === 1 ? "Draw ↔️" : "Lose ❌";
        const extra =
          payout > 0n
            ? `<br/>Payout: <span class="mono">${formatZTC(payout)}</span>`
            : "";
        addStatus({
          title: "Result",
          html: `Wheel: <span class="mono">${wheelVal}</span> | ${txt}${extra}`,
          tone: outcome === 2 ? "success" : outcome === 1 ? "info" : "error",
        });
        toast(
          outcome === 2
            ? `You won! ${payout > 0n ? "Payout: " + formatZTC(payout) : ""}`
            : outcome === 1
            ? "It's a draw."
            : "You lost. Try again!",
          {
            title: "Result",
            type: outcome === 2 ? "success" : outcome === 1 ? "info" : "error",
          }
        );
        $("spinBtn").disabled = false;
        refreshWalletPanels();
        refreshStatics();
      }
    };
    document
      .getElementById("wheelSvg")
      .addEventListener("transitionend", onEnd);
  }, suspenseMs);
}

/* expose helpers for main bootstrap */
export function bootWheelOnce() {
  ensureWheelDom();
  rebuildWheel();
}
