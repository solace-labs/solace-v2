import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SquadsMpl } from "../../../target/types/squads_mpl";
export declare const createTestTransferTransaction: (
  authority: anchor.web3.PublicKey,
  recipient: anchor.web3.PublicKey,
  amount?: number
) => Promise<anchor.web3.TransactionInstruction>;
export declare const createBlankTransaction: (
  program: Program<SquadsMpl>,
  feePayer: anchor.web3.PublicKey
) => Promise<anchor.web3.Transaction>;
export declare const createExecuteTransactionTx: (
  program: Program<SquadsMpl>,
  ms: anchor.web3.PublicKey,
  tx: anchor.web3.PublicKey,
  feePayer: anchor.web3.PublicKey
) => Promise<anchor.web3.Transaction>;
export declare const getMsPDA: (
  creator: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey
) => [anchor.web3.PublicKey, number];
export declare const getTxPDA: (
  msPDA: anchor.web3.PublicKey,
  txIndexBN: anchor.BN,
  programId: anchor.web3.PublicKey
) => Promise<[anchor.web3.PublicKey, number]>;
export declare const getIxPDA: (
  txPDA: anchor.web3.PublicKey,
  iXIndexBN: anchor.BN,
  programId: anchor.web3.PublicKey
) => Promise<[anchor.web3.PublicKey, number]>;
export declare const getAuthorityPDA: (
  msPDA: anchor.web3.PublicKey,
  authorityIndexBN: anchor.BN,
  programId: anchor.web3.PublicKey
) => Promise<[anchor.web3.PublicKey, number]>;
export declare const getNextTxIndex: (
  program: Program<SquadsMpl>,
  msAddress: anchor.web3.PublicKey
) => Promise<number>;
