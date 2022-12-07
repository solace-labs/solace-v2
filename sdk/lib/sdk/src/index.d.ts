import { Connection, PublicKey, Commitment, ConnectionConfig, TransactionInstruction, Signer } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { InstructionAccount, MultisigAccount, TransactionAccount } from "./types";
import { TransactionBuilder } from "./tx_builder";
declare class Squads {
    readonly connection: Connection;
    readonly wallet: Wallet;
    private readonly provider;
    readonly multisigProgramId: PublicKey;
    private readonly multisig;
    readonly programManagerProgramId: PublicKey;
    constructor({ connection, wallet, multisigProgramId, programManagerProgramId, }: {
        connection: Connection;
        wallet: Wallet;
        multisigProgramId?: PublicKey;
        programManagerProgramId?: PublicKey;
    });
    static endpoint(endpoint: string, wallet: Wallet, options?: {
        commitmentOrConfig?: Commitment | ConnectionConfig;
        multisigProgramId?: PublicKey;
        programManagerProgramId?: PublicKey;
    }): Squads;
    static mainnet(wallet: Wallet, options?: {
        commitmentOrConfig?: Commitment | ConnectionConfig;
        multisigProgramId?: PublicKey;
        programManagerProgramId?: PublicKey;
    }): Squads;
    static devnet(wallet: Wallet, options?: {
        commitmentOrConfig?: Commitment | ConnectionConfig;
        multisigProgramId?: PublicKey;
        programManagerProgramId?: PublicKey;
    }): Squads;
    static localnet(wallet: Wallet, options?: {
        commitmentOrConfig?: Commitment | ConnectionConfig;
        multisigProgramId?: PublicKey;
        programManagerProgramId?: PublicKey;
    }): Squads;
    private _addPublicKeys;
    getTransactionBuilder(multisigPDA: PublicKey, authorityIndex: number): Promise<TransactionBuilder>;
    getMultisig(address: PublicKey): Promise<MultisigAccount>;
    getMultisigs(addresses: PublicKey[]): Promise<(MultisigAccount | null)[]>;
    getTransaction(address: PublicKey): Promise<TransactionAccount>;
    getTransactions(addresses: PublicKey[]): Promise<(TransactionAccount | null)[]>;
    getInstruction(address: PublicKey): Promise<InstructionAccount>;
    getInstructions(addresses: PublicKey[]): Promise<(InstructionAccount | null)[]>;
    getNextTransactionIndex(multisigPDA: PublicKey): Promise<number>;
    getNextInstructionIndex(transactionPDA: PublicKey): Promise<number>;
    getAuthorityPDA(multisigPDA: PublicKey, authorityIndex: number): PublicKey;
    private _createMultisig;
    createMultisig(threshold: number, createKey: PublicKey, initialMembers: PublicKey[]): Promise<MultisigAccount>;
    buildCreateMultisig(threshold: number, createKey: PublicKey, initialMembers: PublicKey[]): Promise<TransactionInstruction>;
    private _createTransaction;
    createTransaction(multisigPDA: PublicKey, authorityIndex: number): Promise<TransactionAccount>;
    buildCreateTransaction(multisigPDA: PublicKey, authorityIndex: number, transactionIndex: number): Promise<TransactionInstruction>;
    private _addInstruction;
    addInstruction(transactionPDA: PublicKey, instruction: TransactionInstruction): Promise<InstructionAccount>;
    buildAddInstruction(multisigPDA: PublicKey, transactionPDA: PublicKey, instruction: TransactionInstruction, instructionIndex: number): Promise<TransactionInstruction>;
    private _activateTransaction;
    activateTransaction(transactionPDA: PublicKey): Promise<TransactionAccount>;
    buildActivateTransaction(multisigPDA: PublicKey, transactionPDA: PublicKey): Promise<TransactionInstruction>;
    private _approveTransaction;
    approveTransaction(transactionPDA: PublicKey): Promise<TransactionAccount>;
    buildApproveTransaction(multisigPDA: PublicKey, transactionPDA: PublicKey): Promise<TransactionInstruction>;
    private _rejectTransaction;
    rejectTransaction(transactionPDA: PublicKey): Promise<TransactionAccount>;
    buildRejectTransaction(multisigPDA: PublicKey, transactionPDA: PublicKey): Promise<TransactionInstruction>;
    private _cancelTransaction;
    cancelTransaction(transactionPDA: PublicKey): Promise<TransactionAccount>;
    buildCancelTransaction(multisigPDA: PublicKey, transactionPDA: PublicKey): Promise<TransactionInstruction>;
    private _executeTransaction;
    executeTransaction(transactionPDA: PublicKey, feePayer?: PublicKey, signers?: Signer[]): Promise<TransactionAccount>;
    buildExecuteTransaction(transactionPDA: PublicKey, feePayer?: PublicKey): Promise<TransactionInstruction>;
    private _executeInstruction;
    executeInstruction(transactionPDA: PublicKey, instructionPDA: PublicKey): Promise<InstructionAccount>;
    buildExecuteInstruction(transactionPDA: PublicKey, instructionPDA: PublicKey): Promise<TransactionInstruction>;
}
export default Squads;
export * from "./constants";
export * from "./address";
