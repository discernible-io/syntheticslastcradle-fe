import { providers } from "near-api-js";
import "@near-wallet-selector/modal-ui/styles.css";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupNightly } from "@near-wallet-selector/nightly";
import { env } from "../config/env.js";

const NearIconUrl = new URL(
  "../../node_modules/@near-wallet-selector/my-near-wallet/assets/my-near-wallet-icon.png",
  import.meta.url,
).href;

const NETWORK_PRESETS = {
  mainnet: {
    networkId: "mainnet",
    helperUrl: "https://helper.mainnet.near.org",
    explorerUrl: "https://nearblocks.io",
    indexerUrl: "https://api.fastnear.com/v0",
  },
  testnet: {
    networkId: "testnet",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://testnet.nearblocks.io",
    indexerUrl: "https://test.api.fastnear.com/v0",
  },
};

function resolveNetworkConfig({ network, rpcUrl }) {
  if (!rpcUrl) {
    return network;
  }
  if (typeof network === "object") {
    return { ...network, nodeUrl: rpcUrl };
  }
  const preset = NETWORK_PRESETS[network];
  if (!preset) {
    throw new Error(`Unsupported NEAR network: ${network}`);
  }
  return { ...preset, nodeUrl: rpcUrl };
}

/**
 * Minimal wallet wrapper matching mintserver-idc / near-wallet.js
 * (wallet selector + NEP-413 signMessage).
 */
export class Wallet {
  walletSelector;
  wallet;
  network;
  rpcUrl;
  createAccessKeyFor;
  accountId;

  constructor({
    createAccessKeyFor = undefined,
    network = env.nearNetwork || "mainnet",
    rpcUrl = env.nearRpcUrl || undefined,
  } = {}) {
    this.createAccessKeyFor = createAccessKeyFor;
    this.network = network;
    this.rpcUrl = rpcUrl?.trim() || undefined;
  }

  async startUp() {
    try {
      const network = resolveNetworkConfig({
        network: this.network,
        rpcUrl: this.rpcUrl,
      });

      this.walletSelector = await setupWalletSelector({
        network,
        fallbackRpcUrls: this.rpcUrl ? [this.rpcUrl] : undefined,
        modules: [
          setupMyNearWallet({ iconUrl: NearIconUrl }),
          setupHereWallet(),
          setupNightly(),
        ],
      });

      const isSignedIn = this.walletSelector.isSignedIn();
      if (isSignedIn) {
        this.wallet = await this.walletSelector.wallet();
        const accounts = this.walletSelector.store.getState().accounts;
        if (!accounts.length) {
          throw new Error("No accounts found");
        }
        this.accountId = accounts[0].accountId;
      }
      return isSignedIn;
    } catch (error) {
      console.error("Error during wallet initialization:", error);
      return false;
    }
  }

  signIn() {
    const modal = setupModal(this.walletSelector, {
      contractId: this.createAccessKeyFor,
      description: "Connect a NEAR wallet that owns the privileged IdentyClaw passport",
    });
    modal.show();
  }

  async signOut() {
    if (this.wallet) {
      await this.wallet.signOut();
      this.wallet = null;
      this.accountId = null;
    }
  }

  getProvider() {
    if (!this.walletSelector) {
      throw new Error("Wallet selector not initialized");
    }
    const { network } = this.walletSelector.options;
    return new providers.JsonRpcProvider({ url: network.nodeUrl });
  }

  async signMessageWithNEP413(params) {
    if (!this.wallet?.signMessage) {
      throw new Error("Selected wallet doesn't support message signing (NEP-413)");
    }
    return this.wallet.signMessage(params);
  }

  async viewMethod({ contractId, method, args = {} }) {
    if (!this.walletSelector) {
      throw new Error("Wallet selector not initialized");
    }
    const provider = this.getProvider();
    const args_base64 = Buffer.from(JSON.stringify(args)).toString("base64");
    const res = await provider.query({
      request_type: "call_function",
      account_id: contractId,
      method_name: method,
      args_base64,
      finality: "optimistic",
    });
    return JSON.parse(Buffer.from(res.result).toString());
  }
}

let walletSingleton = null;

export function getOperatorWallet() {
  if (!walletSingleton) {
    walletSingleton = new Wallet({
      createAccessKeyFor: env.nearContractId || undefined,
      network: env.nearNetwork,
      rpcUrl: env.nearRpcUrl || undefined,
    });
  }
  return walletSingleton;
}
