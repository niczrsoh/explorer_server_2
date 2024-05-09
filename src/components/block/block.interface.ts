// block.interface.ts

export interface IBlock {
  number: number;
  nonce?: number;
  sha3Uncles: string;
  transactions: string[];
  miner: string;
  difficulty: number;
  totalDifficulty: number;
  size: number;
  extraData: string;
  gasLimit: number;
  gasUsed: number;
  timestamp: Date;
  transactionNumber: number;
  transactionFee: number;
  blockReward: number;
  internalTransaction: number;
  // ... any other properties you want to include
}
