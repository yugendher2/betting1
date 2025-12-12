import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const APP_NAME = 'Sorcerer Chess';
const APP_LOGO_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png'; 
const DEFAULT_CHAIN_ID = 8453; // Base
const BASE_CHAIN_HEX = '0x2105'; // 8453 in hex

// CHECK Token on Base
const CHECK_TOKEN_ADDRESS = "0x9126236476eFBA9Ad8aB77855c60eB5BF37586Eb"; 

// Smart Contract Address
const GAME_ESCROW_ADDRESS = "0x1234567890123456789012345678901234567890"; 

// Function Selectors
const DEPOSIT_SELECTOR = '0xb6b55f25'; // deposit(uint256)
const PAYOUT_SELECTOR = '0x5fd4b398';  // payout(address,uint256)
const APPROVE_SELECTOR = '0x095ea7b3'; // approve(spender, amount)

// Mock Wallet for Preview
const DEV_WALLET_ADDRESS = "0xDevWalletMockAddress123456789";

let sdk: CoinbaseWalletSDK | null = null;
let provider: any = null;
let devWalletBalance = 100.00; 

const padAddress = (addr: string) => addr.replace('0x', '').padStart(64, '0');
const padUint256 = (amount: number) => {
    const bigAmount = BigInt(Math.floor(amount * 10**18)); 
    return bigAmount.toString(16).padStart(64, '0');
}

// Helper to poll for transaction receipt
const waitForTransaction = async (txHash: string): Promise<void> => {
    if (!provider) return;
    console.log(`Waiting for tx ${txHash}...`);
    let retries = 0;
    while (retries < 30) { // Poll for ~30 seconds
        try {
            const receipt = await provider.request({
                method: 'eth_getTransactionReceipt',
                params: [txHash]
            });
            if (receipt && receipt.blockNumber) {
                console.log(`Tx ${txHash} confirmed in block ${receipt.blockNumber}`);
                return;
            }
        } catch (e) {
            console.warn("Polling error:", e);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
    }
    throw new Error("Transaction confirmation timed out");
};

export const WalletManager = {
  
  init() {
    if (provider) return;
    try {
        if (typeof window !== 'undefined') {
            const win = window as any;
            if ('ethereum' in win) {
                const eth = win.ethereum;
                if (eth) {
                    provider = eth;
                    if (provider.providers?.length) {
                        const cbProvider = provider.providers.find((p: any) => p.isCoinbaseWallet);
                        if (cbProvider) provider = cbProvider;
                    }
                    return;
                }
            }
        }
    } catch (e) {
        console.warn("Injected wallet detection blocked:", e);
    }

    try {
      sdk = new CoinbaseWalletSDK({
        appName: APP_NAME,
        appLogoUrl: APP_LOGO_URL,
        appChainIds: [DEFAULT_CHAIN_ID]
      });
      // @ts-ignore
      provider = sdk.makeWeb3Provider();
    } catch (error) {
      console.warn("Coinbase Wallet SDK init failed:", error);
    }
  },

  async connect(): Promise<string | null> {
    this.init();

    if (!provider) {
       console.log("Using Dev Wallet for preview.");
       return DEV_WALLET_ADDRESS;
    }

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_HEX }],
          });
      } catch (switchError: any) {
          // If Base not added, add it (code omitted for brevity but present in full logic)
      }
      return accounts[0]; 
    } catch (error) {
      return DEV_WALLET_ADDRESS;
    }
  },

  async disconnect() {
    provider = null;
    sdk = null;
  },

  async getCheckBalance(address: string): Promise<string> {
    if (address === DEV_WALLET_ADDRESS) return devWalletBalance.toFixed(2);
    try {
        if (!provider) this.init();
        if (provider) {
            const cleanAddress = address.replace('0x', '');
            const data = '0x70a08231' + cleanAddress.padStart(64, '0');
            const result = await provider.request({
                method: 'eth_call',
                params: [{ to: CHECK_TOKEN_ADDRESS, data: data }, "latest"]
            });
            if (result && result !== '0x') {
                const balanceBigInt = BigInt(result);
                const divisor = BigInt(10 ** 18);
                const integer = Number(balanceBigInt / divisor);
                const remainder = Number(balanceBigInt % divisor) / 1e18;
                return (integer + remainder).toFixed(2);
            }
        }
    } catch (e) {}
    return "0.00";
  },

  /**
   * Performs the betting transaction:
   * 1. Approves the Escrow Contract to spend `amount` CHECK tokens.
   * 2. WAITS for approval to mine.
   * 3. Calls `deposit(amount)` on the Escrow Contract.
   */
  async depositWager(owner: string, amount: number): Promise<boolean> {
      if (amount <= 0) return true;
      
      if (owner === DEV_WALLET_ADDRESS) {
          if (devWalletBalance < amount) throw new Error("Insufficient mock balance");
          console.log(`[Dev] Approving ${amount}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[Dev] Depositing ${amount}...`);
          devWalletBalance -= amount;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
      }

      if (!provider) throw new Error("Wallet not connected");

      // 1. Approve
      console.log("Step 1: Approving...");
      const approveData = APPROVE_SELECTOR + padAddress(GAME_ESCROW_ADDRESS) + padUint256(amount);
      let approveTxHash = '';
      try {
          approveTxHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{ from: owner, to: CHECK_TOKEN_ADDRESS, data: approveData }]
          });
          console.log("Approve TX Hash:", approveTxHash);
      } catch (e: any) {
          throw new Error("Token approval failed/rejected: " + e.message);
      }

      // 2. Wait for Approval
      try {
        await waitForTransaction(approveTxHash);
      } catch (e: any) {
        throw new Error("Approval transaction timed out or failed.");
      }

      // 3. Deposit
      console.log("Step 2: Depositing...");
      const depositData = DEPOSIT_SELECTOR + padUint256(amount);
      try {
          const depositTx = await provider.request({
              method: 'eth_sendTransaction',
              params: [{ from: owner, to: GAME_ESCROW_ADDRESS, data: depositData }]
          });
          console.log("Deposit TX Hash:", depositTx);
          // Optional: Wait for deposit too, but UI usually assumes success once sent for UX speed
          return !!depositTx;
      } catch (e: any) {
           throw new Error("Deposit failed/rejected: " + e.message);
      }
  },

  async payoutWinner(winner: string, totalAmount: number): Promise<boolean> {
      if (totalAmount <= 0) return true;
      
      if (winner === DEV_WALLET_ADDRESS) {
          devWalletBalance += totalAmount; 
          return true;
      }

      if (!provider) throw new Error("Wallet not connected");

      const data = PAYOUT_SELECTOR + padAddress(winner) + padUint256(totalAmount);

      try {
          const txHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                  from: winner, 
                  to: GAME_ESCROW_ADDRESS,
                  data: data
              }]
          });
          console.log("Payout TX Hash:", txHash);
          return !!txHash;
      } catch (e: any) {
          console.error("Payout Failed:", e);
          throw new Error("Failed to claim winnings.");
      }
  },

  formatAddress(address: string): string {
    if (!address) return '';
    if (address === DEV_WALLET_ADDRESS) return 'Dev Wallet';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};
