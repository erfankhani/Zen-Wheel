import { $ } from "../utils/dom.js";
import { shortAddr, formatZTC } from "../utils/format.js";
import {
  CONTRACT_ADDRESS,
  REQUIRED_CHAIN_ID_HEX,
  RPC_URL,
  EXPLORER_URL,
  CHAIN_DECIMALS,
} from "../config.js";

let provider, signer, contract, account;
let onAccChanged,
  onChainChanged,
  listenersAttached = false;

export function getWeb3() {
  return { provider, signer, contract, account };
}
export function setContract(c) {
  contract = c;
} // used by game.js

export async function addOrSwitchZenChain() {
  try {
    await window.ethereum?.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: REQUIRED_CHAIN_ID_HEX,
          chainName: "ZenChain Testnet",
          rpcUrls: [RPC_URL],
          nativeCurrency: {
            name: "ZenChain Token",
            symbol: "ZTC",
            decimals: CHAIN_DECIMALS,
          },
          blockExplorerUrls: [EXPLORER_URL],
        },
      ],
    });
  } catch (_) {}
  try {
    await window.ethereum?.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: REQUIRED_CHAIN_ID_HEX }],
    });
  } catch (_) {}
}

export async function connectWithInjected(ethersABI) {
  if (!window.ethereum) {
    throw new Error("No injected wallet found (install MetaMask/Rabby).");
  }
  const prov = new ethers.BrowserProvider(window.ethereum);
  await prov.send("eth_requestAccounts", []);
  provider = prov;
  await addOrSwitchZenChain();
  const net = await provider.getNetwork();
  $("sidebarNetwork").textContent =
    ("0x" + Number(net.chainId).toString(16)).toLowerCase() ===
    REQUIRED_CHAIN_ID_HEX.toLowerCase()
      ? "ZenChain"
      : "Wrong network";
  signer = await provider.getSigner();
  account = await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ethersABI, signer);

  $("connectBtn").classList.add("hidden");
  $("accountPill").classList.remove("hidden");
  $("accountShort").textContent = shortAddr(account);

  if (window.ethereum && !listenersAttached) {
    onAccChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        await disconnectSoft();
        return;
      }
      const next = accounts[0];
      if (!account || next.toLowerCase() !== account.toLowerCase()) {
        account = next;
        signer = await provider.getSigner();
        $("accountShort").textContent = shortAddr(account);
        $("addrShortModal").textContent = shortAddr(account);
        $("explorerLink").href = `${EXPLORER_URL}/address/${account}`;
        await refreshWalletPanels();
      }
    };
    onChainChanged = async (chainId) => {
      const ok =
        (chainId || "").toLowerCase() === REQUIRED_CHAIN_ID_HEX.toLowerCase();
      $("sidebarNetwork").textContent = ok ? "ZenChain" : "Wrong network";
      await refreshWalletPanels();
    };
    window.ethereum.on("accountsChanged", onAccChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    listenersAttached = true;
  }

  $("addrShortModal").textContent = shortAddr(account);
  $("explorerLink").href = `${EXPLORER_URL}/address/${account}`;
  await refreshWalletPanels();

  return { provider, signer, contract, account };
}

export async function refreshWalletPanels() {
  const connected = !!account;
  $("statusText").textContent = connected ? "Connected" : "Disconnected";
  $("statusText").style.color = connected ? "var(--ok)" : "var(--danger)";
  $("statusSub").textContent = connected ? "connected" : "not connected";
  $("statusDot").firstElementChild.className =
    "w-2.5 h-2.5 rounded-full " +
    (connected ? "bg-emerald-500" : "bg-rose-500");
  const netBox = $("networkBox"),
    balBox = $("balanceBox");
  if (connected) {
    netBox.classList.remove("hidden");
    balBox.classList.remove("hidden");
    $("sidebarNetwork").textContent = "ZenChain";
    const bal = await provider.getBalance(account);
    $("sidebarBalance").textContent = formatZTC(bal);
  } else {
    netBox.classList.add("hidden");
    balBox.classList.add("hidden");
    $("sidebarNetwork").textContent = "—";
    $("sidebarBalance").textContent = "—";
  }
}

export async function disconnectSoft() {
  try {
    if (window.ethereum && listenersAttached) {
      if (onAccChanged)
        window.ethereum.removeListener("accountsChanged", onAccChanged);
      if (onChainChanged)
        window.ethereum.removeListener("chainChanged", onChainChanged);
      listenersAttached = false;
      onAccChanged = onChainChanged = undefined;
    }
  } catch (_) {}
  provider = signer = contract = undefined;
  account = undefined;
  $("accountPill").classList.add("hidden");
  $("connectBtn").classList.remove("hidden");
  await refreshWalletPanels();
  try {
    await window.ethereum?.request?.({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (_) {}
}
