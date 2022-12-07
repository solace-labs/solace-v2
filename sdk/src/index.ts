import {
  Connection,
  PublicKey,
  Commitment,
  ConnectionConfig,
  TransactionInstruction,
  Signer,
} from "@solana/web3.js";
import {
  DEFAULT_MULTISIG_PROGRAM_ID,
  DEFAULT_PROGRAM_MANAGER_PROGRAM_ID,
} from "./constants";
import squadsMplJSON from "../../target/idl/squads_mpl.json";
import { SquadsMpl } from "../../target/types/squads_mpl";
import { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { AnchorProvider, Program } from "@project-serum/anchor";
import {
  InstructionAccount,
  MultisigAccount,
  SquadsMethods,
  TransactionAccount,
} from "./types";
import {
  getAuthorityPDA,
  getIxPDA,
  getManagedProgramPDA,
  getMsPDA,
  getProgramManagerPDA,
  getProgramUpgradePDA,
  getTxPDA,
} from "./address";
import BN from "bn.js";
import * as anchor from "@project-serum/anchor";
import { TransactionBuilder } from "./tx_builder";

class Squads {
  readonly connection: Connection;
  readonly wallet: Wallet;
  private readonly provider: AnchorProvider;
  readonly multisigProgramId: PublicKey;
  private readonly multisig: Program<SquadsMpl>;
  readonly programManagerProgramId: PublicKey;

  constructor({
    connection,
    wallet,
    multisigProgramId,
    programManagerProgramId,
  }: {
    connection: Connection;
    wallet: Wallet;
    multisigProgramId?: PublicKey;
    programManagerProgramId?: PublicKey;
  }) {
    this.connection = connection;
    this.wallet = wallet;
    this.multisigProgramId = multisigProgramId ?? DEFAULT_MULTISIG_PROGRAM_ID;
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    this.multisig = new Program<SquadsMpl>(
      // @ts-ignore
      squadsMplJSON as SquadsMpl,
      this.multisigProgramId,
      this.provider
    );
    this.programManagerProgramId =
      programManagerProgramId ?? DEFAULT_PROGRAM_MANAGER_PROGRAM_ID;
  }

  static endpoint(
    endpoint: string,
    wallet: Wallet,
    options?: {
      commitmentOrConfig?: Commitment | ConnectionConfig;
      multisigProgramId?: PublicKey;
      programManagerProgramId?: PublicKey;
    }
  ) {
    return new Squads({
      connection: new Connection(endpoint, options?.commitmentOrConfig),
      wallet,
      ...options,
    });
  }

  static mainnet(
    wallet: Wallet,
    options?: {
      commitmentOrConfig?: Commitment | ConnectionConfig;
      multisigProgramId?: PublicKey;
      programManagerProgramId?: PublicKey;
    }
  ) {
    return new Squads({
      connection: new Connection(
        "https://api.mainnet-beta.solana.com",
        options?.commitmentOrConfig
      ),
      wallet,
      ...options,
    });
  }

  static devnet(
    wallet: Wallet,
    options?: {
      commitmentOrConfig?: Commitment | ConnectionConfig;
      multisigProgramId?: PublicKey;
      programManagerProgramId?: PublicKey;
    }
  ) {
    return new Squads({
      connection: new Connection(
        "https://api.devnet.solana.com",
        options?.commitmentOrConfig
      ),
      wallet,
      ...options,
    });
  }

  static localnet(
    wallet: Wallet,
    options?: {
      commitmentOrConfig?: Commitment | ConnectionConfig;
      multisigProgramId?: PublicKey;
      programManagerProgramId?: PublicKey;
    }
  ) {
    return new Squads({
      connection: new Connection(
        "http://localhost:8899",
        options?.commitmentOrConfig
      ),
      wallet,
      ...options,
    });
  }

  private _addPublicKeys(items: any[], addresses: PublicKey[]): (any | null)[] {
    return items.map((item, index) =>
      item ? { ...item, publicKey: addresses[index] } : null
    );
  }

  async getTransactionBuilder(
    multisigPDA: PublicKey,
    authorityIndex: number
  ): Promise<TransactionBuilder> {
    const multisig = await this.getMultisig(multisigPDA);
    return new TransactionBuilder(
      this.multisig.methods,
      this.provider,
      multisig,
      authorityIndex,
      this.multisigProgramId
    );
  }

  async getMultisig(address: PublicKey): Promise<MultisigAccount> {
    const accountData = await this.multisig.account.ms.fetch(
      address,
      "processed"
    );
    return { ...accountData, publicKey: address } as MultisigAccount;
  }

  async getMultisigs(
    addresses: PublicKey[]
  ): Promise<(MultisigAccount | null)[]> {
    const accountData = await this.multisig.account.ms.fetchMultiple(
      addresses,
      "processed"
    );
    return this._addPublicKeys(
      accountData,
      addresses
    ) as (MultisigAccount | null)[];
  }

  async getTransaction(address: PublicKey): Promise<TransactionAccount> {
    const accountData = await this.multisig.account.msTransaction.fetch(
      address,
      "processed"
    );
    return { ...accountData, publicKey: address };
  }

  async getTransactions(
    addresses: PublicKey[]
  ): Promise<(TransactionAccount | null)[]> {
    const accountData = await this.multisig.account.msTransaction.fetchMultiple(
      addresses,
      "processed"
    );
    return this._addPublicKeys(
      accountData,
      addresses
    ) as (TransactionAccount | null)[];
  }

  async getInstruction(address: PublicKey): Promise<InstructionAccount> {
    const accountData = await this.multisig.account.msInstruction.fetch(
      address,
      "processed"
    );
    return { ...accountData, publicKey: address };
  }

  async getInstructions(
    addresses: PublicKey[]
  ): Promise<(InstructionAccount | null)[]> {
    const accountData = await this.multisig.account.msInstruction.fetchMultiple(
      addresses,
      "processed"
    );
    return this._addPublicKeys(
      accountData,
      addresses
    ) as (InstructionAccount | null)[];
  }

  async getNextTransactionIndex(multisigPDA: PublicKey): Promise<number> {
    const multisig = await this.getMultisig(multisigPDA);
    return multisig.transactionIndex + 1;
  }

  async getNextInstructionIndex(transactionPDA: PublicKey): Promise<number> {
    const transaction = await this.getTransaction(transactionPDA);
    return transaction.instructionIndex + 1;
  }

  getAuthorityPDA(multisigPDA: PublicKey, authorityIndex: number): PublicKey {
    return getAuthorityPDA(
      multisigPDA,
      new BN(authorityIndex, 10),
      this.multisigProgramId
    )[0];
  }

  private _createMultisig(
    threshold: number,
    createKey: PublicKey,
    initialMembers: PublicKey[],
    name: string,
    description = "",
    image = ""
  ): [SquadsMethods, PublicKey] {
    if (
      !initialMembers.find((member) => member.equals(this.wallet.publicKey))
    ) {
      initialMembers.push(this.wallet.publicKey);
    }
    const [multisigPDA] = getMsPDA(createKey, this.multisigProgramId);
    return [
      this.multisig.methods
        .create(threshold, createKey, initialMembers)
        .accounts({ multisig: multisigPDA, creator: this.wallet.publicKey }),
      multisigPDA,
    ];
  }

  async createMultisig(
    threshold: number,
    createKey: PublicKey,
    initialMembers: PublicKey[],
    name: string,
    description = "",
    image = ""
  ): Promise<MultisigAccount> {
    const [methods, multisigPDA] = this._createMultisig(
      threshold,
      createKey,
      initialMembers,
      JSON.stringify({ name, description, image })
    );
    await methods.rpc();
    return await this.getMultisig(multisigPDA);
  }

  async buildCreateMultisig(
    threshold: number,
    createKey: PublicKey,
    initialMembers: PublicKey[],
    name: string,
    description = "",
    image = ""
  ): Promise<TransactionInstruction> {
    const [methods] = this._createMultisig(
      threshold,
      createKey,
      initialMembers,
      JSON.stringify({ name, description, image })
    );
    return await methods.instruction();
  }

  private async _createTransaction(
    multisigPDA: PublicKey,
    authorityIndex: number,
    transactionIndex: number
  ): Promise<[SquadsMethods, PublicKey]> {
    const [transactionPDA] = getTxPDA(
      multisigPDA,
      new BN(transactionIndex, 10),
      this.multisigProgramId
    );
    return [
      this.multisig.methods.createTransaction(authorityIndex).accounts({
        multisig: multisigPDA,
        transaction: transactionPDA,
        creator: this.wallet.publicKey,
      }),
      transactionPDA,
    ];
  }

  async createTransaction(
    multisigPDA: PublicKey,
    authorityIndex: number
  ): Promise<TransactionAccount> {
    const nextTransactionIndex = await this.getNextTransactionIndex(
      multisigPDA
    );
    const [methods, transactionPDA] = await this._createTransaction(
      multisigPDA,
      authorityIndex,
      nextTransactionIndex
    );
    await methods.rpc();
    return await this.getTransaction(transactionPDA);
  }

  async buildCreateTransaction(
    multisigPDA: PublicKey,
    authorityIndex: number,
    transactionIndex: number
  ): Promise<TransactionInstruction> {
    const [methods] = await this._createTransaction(
      multisigPDA,
      authorityIndex,
      transactionIndex
    );
    return await methods.instruction();
  }

  private async _addInstruction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey,
    instruction: TransactionInstruction,
    instructionIndex: number
  ): Promise<[SquadsMethods, PublicKey]> {
    const [instructionPDA] = getIxPDA(
      transactionPDA,
      new BN(instructionIndex, 10),
      this.multisigProgramId
    );
    return [
      this.multisig.methods.addInstruction(instruction).accounts({
        multisig: multisigPDA,
        transaction: transactionPDA,
        instruction: instructionPDA,
        creator: this.wallet.publicKey,
      }),
      instructionPDA,
    ];
  }

  async addInstruction(
    transactionPDA: PublicKey,
    instruction: TransactionInstruction
  ): Promise<InstructionAccount> {
    const transaction = await this.getTransaction(transactionPDA);
    const [methods, instructionPDA] = await this._addInstruction(
      transaction.ms,
      transactionPDA,
      instruction,
      transaction.instructionIndex + 1
    );
    await methods.rpc();
    return await this.getInstruction(instructionPDA);
  }

  async buildAddInstruction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey,
    instruction: TransactionInstruction,
    instructionIndex: number
  ): Promise<TransactionInstruction> {
    const [methods] = await this._addInstruction(
      multisigPDA,
      transactionPDA,
      instruction,
      instructionIndex
    );
    return await methods.instruction();
  }

  private async _activateTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<SquadsMethods> {
    return this.multisig.methods.activateTransaction().accounts({
      multisig: multisigPDA,
      transaction: transactionPDA,
      creator: this.wallet.publicKey,
    });
  }

  async activateTransaction(
    transactionPDA: PublicKey
  ): Promise<TransactionAccount> {
    const transaction = await this.getTransaction(transactionPDA);
    const methods = await this._activateTransaction(
      transaction.ms,
      transactionPDA
    );
    await methods.rpc();
    return await this.getTransaction(transactionPDA);
  }

  async buildActivateTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const methods = await this._activateTransaction(
      multisigPDA,
      transactionPDA
    );
    return await methods.instruction();
  }

  private async _approveTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<SquadsMethods> {
    return this.multisig.methods.approveTransaction().accounts({
      multisig: multisigPDA,
      transaction: transactionPDA,
      member: this.wallet.publicKey,
    });
  }

  async approveTransaction(
    transactionPDA: PublicKey
  ): Promise<TransactionAccount> {
    const transaction = await this.getTransaction(transactionPDA);
    const methods = await this._approveTransaction(
      transaction.ms,
      transactionPDA
    );
    await methods.rpc();
    return await this.getTransaction(transactionPDA);
  }

  async buildApproveTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const methods = await this._approveTransaction(multisigPDA, transactionPDA);
    return await methods.instruction();
  }

  private async _rejectTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<SquadsMethods> {
    return this.multisig.methods.rejectTransaction().accounts({
      multisig: multisigPDA,
      transaction: transactionPDA,
      member: this.wallet.publicKey,
    });
  }

  async rejectTransaction(
    transactionPDA: PublicKey
  ): Promise<TransactionAccount> {
    const transaction = await this.getTransaction(transactionPDA);
    const methods = await this._rejectTransaction(
      transaction.ms,
      transactionPDA
    );
    await methods.rpc();
    return await this.getTransaction(transactionPDA);
  }

  async buildRejectTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const methods = await this._rejectTransaction(multisigPDA, transactionPDA);
    return await methods.instruction();
  }

  private async _cancelTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<SquadsMethods> {
    return this.multisig.methods.cancelTransaction().accounts({
      multisig: multisigPDA,
      transaction: transactionPDA,
      member: this.wallet.publicKey,
    });
  }

  async cancelTransaction(
    transactionPDA: PublicKey
  ): Promise<TransactionAccount> {
    const transaction = await this.getTransaction(transactionPDA);
    const methods = await this._cancelTransaction(
      transaction.ms,
      transactionPDA
    );
    await methods.rpc();
    return await this.getTransaction(transactionPDA);
  }

  async buildCancelTransaction(
    multisigPDA: PublicKey,
    transactionPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const methods = await this._cancelTransaction(multisigPDA, transactionPDA);
    return await methods.instruction();
  }

  private async _executeTransaction(
    transactionPDA: PublicKey,
    feePayer: PublicKey
  ): Promise<TransactionInstruction> {
    const transaction = await this.getTransaction(transactionPDA);
    const ixList = await Promise.all(
      [...new Array(transaction.instructionIndex)].map(async (a, i) => {
        const ixIndexBN = new anchor.BN(i + 1, 10);
        const [ixKey] = getIxPDA(
          transactionPDA,
          ixIndexBN,
          this.multisigProgramId
        );
        const ixAccount = await this.getInstruction(ixKey);
        return { pubkey: ixKey, ixItem: ixAccount };
      })
    );

    const ixKeysList: anchor.web3.AccountMeta[] = ixList
      .map(({ pubkey, ixItem }) => {
        const ixKeys: anchor.web3.AccountMeta[] =
          ixItem.keys as anchor.web3.AccountMeta[];
        const addSig = anchor.utils.sha256.hash("global:add_member");
        const ixDiscriminator = Buffer.from(addSig, "hex");
        const addData = Buffer.concat([ixDiscriminator.slice(0, 8)]);
        const addAndThreshSig = anchor.utils.sha256.hash(
          "global:add_member_and_change_threshold"
        );
        const ixAndThreshDiscriminator = Buffer.from(addAndThreshSig, "hex");
        const addAndThreshData = Buffer.concat([
          ixAndThreshDiscriminator.slice(0, 8),
        ]);
        const ixData = ixItem.data as any;

        const formattedKeys = ixKeys.map((ixKey, keyInd) => {
          if (
            (ixData.includes(addData) || ixData.includes(addAndThreshData)) &&
            keyInd === 2
          ) {
            return {
              pubkey: feePayer,
              isSigner: false,
              isWritable: ixKey.isWritable,
            };
          }
          return {
            pubkey: ixKey.pubkey,
            isSigner: false,
            isWritable: ixKey.isWritable,
          };
        });

        return [
          { pubkey, isSigner: false, isWritable: false },
          { pubkey: ixItem.programId, isSigner: false, isWritable: false },
          ...formattedKeys,
        ];
      })
      .reduce((p, c) => p.concat(c), []);

    //  [ix ix_account, ix program_id, key1, key2 ...]
    const keysUnique: anchor.web3.AccountMeta[] = ixKeysList.reduce(
      (prev, curr) => {
        const inList = prev.findIndex(
          (a) => a.pubkey.toBase58() === curr.pubkey.toBase58()
        );
        // if its already in the list, and has same write flag
        if (inList >= 0 && prev[inList].isWritable === curr.isWritable) {
          return prev;
        } else {
          prev.push({
            pubkey: curr.pubkey,
            isWritable: curr.isWritable,
            isSigner: curr.isSigner,
          });
          return prev;
        }
      },
      [] as anchor.web3.AccountMeta[]
    );

    const keyIndexMap = ixKeysList.map((a) => {
      return keysUnique.findIndex(
        (k) =>
          k.pubkey.toBase58() === a.pubkey.toBase58() &&
          k.isWritable === a.isWritable
      );
    });

    const executeIx = await this.multisig.methods
      .executeTransaction(Buffer.from(keyIndexMap))
      .accounts({
        multisig: transaction.ms,
        transaction: transactionPDA,
        member: feePayer,
      })
      .instruction();
    executeIx.keys = executeIx.keys.concat(keysUnique);
    return executeIx;
  }

  async executeTransaction(
    transactionPDA: PublicKey,
    feePayer?: PublicKey,
    signers?: Signer[]
  ): Promise<TransactionAccount> {
    const payer = feePayer ?? this.wallet.publicKey;
    const executeIx = await this._executeTransaction(transactionPDA, payer);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const lastValidBlockHeight = await this.connection.getBlockHeight();
    const executeTx = new anchor.web3.Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: payer,
    });
    executeTx.add(executeIx);
    await this.provider.sendAndConfirm(executeTx, signers);
    return await this.getTransaction(transactionPDA);
  }

  async buildExecuteTransaction(
    transactionPDA: PublicKey,
    feePayer?: PublicKey
  ): Promise<TransactionInstruction> {
    const payer = feePayer ?? this.wallet.publicKey;
    return await this._executeTransaction(transactionPDA, payer);
  }

  private async _executeInstruction(
    transactionPDA: PublicKey,
    instructionPDA: PublicKey
  ): Promise<SquadsMethods> {
    const transaction = await this.getTransaction(transactionPDA);
    const instruction = await this.getInstruction(instructionPDA);
    const remainingAccountKeys: anchor.web3.AccountMeta[] = [
      { pubkey: instruction.programId, isSigner: false, isWritable: false },
    ].concat(
      (instruction.keys as anchor.web3.AccountMeta[]).map((key) => ({
        ...key,
        isSigner: false,
      }))
    );
    return this.multisig.methods
      .executeInstruction()
      .accounts({
        multisig: transaction.ms,
        transaction: transactionPDA,
        instruction: instructionPDA,
        member: this.wallet.publicKey,
      })
      .remainingAccounts(remainingAccountKeys);
  }

  async executeInstruction(
    transactionPDA: PublicKey,
    instructionPDA: PublicKey
  ): Promise<InstructionAccount> {
    const methods = await this._executeInstruction(
      transactionPDA,
      instructionPDA
    );
    await methods.rpc();
    return await this.getInstruction(instructionPDA);
  }

  async buildExecuteInstruction(
    transactionPDA: PublicKey,
    instructionPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const methods = await this._executeInstruction(
      transactionPDA,
      instructionPDA
    );
    return await methods.instruction();
  }
}

export default Squads;

export * from "./constants";
export * from "./address";
