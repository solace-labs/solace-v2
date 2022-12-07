import { expect } from "chai";
import fs from "fs";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SquadsMpl } from "../idl/squads_mpl";
import { Roles } from "../idl/roles";
import { Mesh } from "../idl/mesh";

import {
  createBlankTransaction,
  createTestTransferTransaction,
  executeTransaction,
} from "../helpers/transactions";
import { execSync } from "child_process";
import {
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import Squads, {
  getMsPDA,
  getIxPDA,
  getProgramManagerPDA,
  getAuthorityPDA,
  getTxPDA,
} from "@sqds/sdk";
import BN from "bn.js";
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@project-serum/anchor/dist/cjs/utils/token";
import {
  getExecuteProxyInstruction,
  getUserRolePDA,
  getUserDelegatePDA,
  getRolesManager,
} from "../helpers/roles";

import { memberListApprove } from "../helpers/approve";

const BPF_UPGRADE_ID = new anchor.web3.PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

const deploySmpl = () => {
  const deployCmd = `solana program deploy --url localhost -v --program-id $(pwd)/target/deploy/squads_mpl-keypair.json $(pwd)/target/deploy/squads_mpl.so`;
  execSync(deployCmd);
};

// will deploy a buffer for the program manager program
const writeBuffer = (bufferKeypair: string) => {
  const writeCmd = `solana program write-buffer --buffer ${bufferKeypair} --url localhost -v $(pwd)/target/deploy/program_manager.so`;
  execSync(writeCmd);
};

const setBufferAuthority = (
  bufferAddress: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey
) => {
  const authCmd = `solana program set-buffer-authority --url localhost ${bufferAddress.toBase58()} --new-buffer-authority ${authority.toBase58()}`;
  execSync(authCmd);
};

const setProgramAuthority = (
  programAddress: anchor.web3.PublicKey,
  authority: anchor.web3.PublicKey
) => {
  try {
    const logsCmd = `solana program show --url localhost --programs`;
    execSync(logsCmd, { stdio: "inherit" });
    const authCmd = `solana program set-upgrade-authority --url localhost ${programAddress.toBase58()} --new-upgrade-authority ${authority.toBase58()}`;
    execSync(authCmd, { stdio: "inherit" });
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
};

const getIxAuthority = async (
  txPda: anchor.web3.PublicKey,
  index: anchor.BN,
  programId: anchor.web3.PublicKey
) => {
  return anchor.web3.PublicKey.findProgramAddress(
    [
      anchor.utils.bytes.utf8.encode("squad"),
      txPda.toBuffer(),
      index.toArrayLike(Buffer, "le", 4),
      anchor.utils.bytes.utf8.encode("ix_authority"),
    ],
    programId
  );
};

let provider;

describe("Programs", function () {
  this.beforeAll(function () {
    // Configure the client to use the local cluster.
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  });

  describe("SMPL, Program Manager, & Roles", function () {
    let program;
    let squads;
    let creator;
    let randomCreateKey;
    let msPDA;
    let member2;
    let rolesProgram;

    const numberOfMembersTotal = 10;
    const memberList = [...new Array(numberOfMembersTotal - 1)].map(() => {
      return anchor.web3.Keypair.generate();
    });

    let threshold = 1;

    // test suite
    describe("SMPL Basic functionality", async function () {
      this.beforeAll(async function () {
        console.log("Deploying programs...");
        deploySmpl();
        console.log("✔ SMPL Program deployed.");

        program = anchor.workspace.SquadsMpl as Program<SquadsMpl>;
        squads = Squads.localnet(provider.wallet, {
          commitmentOrConfig: provider.connection.commitment,
          multisigProgramId: anchor.workspace.SquadsMpl.programId,
        });
        // the program-manager program / provider

        creator = (program.provider as anchor.AnchorProvider).wallet;

        // the Multisig PDA to use for the test run
        randomCreateKey = anchor.web3.Keypair.generate().publicKey;
        [msPDA] = getMsPDA(randomCreateKey, squads.multisigProgramId);

        member2 = anchor.web3.Keypair.generate();
      });

      it(`Create Multisig`, async function () {
        await squads.createMultisig(
          threshold,
          randomCreateKey,
          memberList.map((m) => m.publicKey)
        );
        const vaultPDA = squads.getAuthorityPDA(msPDA, 1);

        const fundingTx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        const fundingIx = await createTestTransferTransaction(
          creator.publicKey,
          vaultPDA,
          0.001 * 1000000000
        );

        fundingTx.add(fundingIx);
        await provider.sendAndConfirm(fundingTx);

        let msState = await squads.getMultisig(msPDA);
        expect(msState.threshold).to.equal(1);
        expect(msState.transactionIndex).to.equal(0);
        expect((msState.keys as any[]).length).to.equal(numberOfMembersTotal);

        const vaultAccount = await squads.connection.getParsedAccountInfo(
          vaultPDA
        );
        expect(vaultAccount.value.lamports).to.equal(0.001 * 1000000000);
      });

      it(`Create Tx draft`, async function () {
        // create a transaction draft
        const txState = await squads.createTransaction(msPDA, 1);
        expect(txState.instructionIndex).to.equal(0);
        expect(txState.creator.toBase58()).to.equal(
          creator.publicKey.toBase58()
        );

        // check the transaction indexes match
        const msState = await squads.getMultisig(msPDA);
        expect(txState.transactionIndex).to.equal(msState.transactionIndex);
      });

      it(`Add Ix to Tx`, async function () {
        // create a transaction draft
        let txState = await squads.createTransaction(msPDA, 1);
        // check the transaction indexes match
        expect(txState.instructionIndex).to.equal(0);
        expect(txState.status).to.have.property("draft");

        const testIx = await createTestTransferTransaction(
          msPDA,
          creator.publicKey
        );
        const ixState = await squads.addInstruction(txState.publicKey, testIx);
        txState = await squads.getTransaction(txState.publicKey);
        expect(ixState.instructionIndex).to.equal(1);
        expect(txState.instructionIndex).to.equal(1);
      });

      it(`Tx Activate`, async function () {
        // create a transaction draft
        let txState = await squads.createTransaction(msPDA, 1);
        const testIx = await createTestTransferTransaction(
          msPDA,
          creator.publicKey
        );
        let ixState = await squads.addInstruction(txState.publicKey, testIx);
        await squads.activateTransaction(txState.publicKey);

        txState = await squads.getTransaction(txState.publicKey);
        expect(txState.status).to.have.property("active");
        ixState = await squads.getInstruction(ixState.publicKey);
        expect(ixState.programId.toBase58()).to.equal(
          testIx.programId.toBase58()
        );
      });

      it(`Tx Sign`, async function () {
        // create a transaction draft
        let txState = await squads.createTransaction(msPDA, 1);
        const testIx = await createTestTransferTransaction(
          msPDA,
          creator.publicKey
        );
        await squads.addInstruction(txState.publicKey, testIx);
        await squads.activateTransaction(txState.publicKey);
        await squads.approveTransaction(txState.publicKey);

        txState = await squads.getTransaction(txState.publicKey);
        expect(txState.approved.length).to.equal(1);
        expect(txState.status).to.have.property("executeReady");
      });

      it(`Transfer Tx Execute`, async function () {
        // create authority to use (Vault, index 1)
        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);

        // the test transfer instruction
        const testPayee = anchor.web3.Keypair.generate();
        const testIx = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey
        );

        let txState = await squads.createTransaction(msPDA, 1);
        await squads.addInstruction(txState.publicKey, testIx);
        await squads.activateTransaction(txState.publicKey);
        await squads.approveTransaction(txState.publicKey);

        txState = await squads.getTransaction(txState.publicKey);
        expect(txState.status).to.have.property("executeReady");

        // move funds to auth/vault
        const moveFundsToMsPDATx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        const moveFundsToMsPDAIx = await createTestTransferTransaction(
          creator.publicKey,
          authorityPDA
        );
        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
        await provider.sendAndConfirm(moveFundsToMsPDATx);
        const authorityPDAFunded = await squads.connection.getAccountInfo(
          authorityPDA
        );
        expect(authorityPDAFunded.lamports).to.equal(2000000);

        await squads.executeTransaction(txState.publicKey);

        txState = await squads.getTransaction(txState.publicKey);

        expect(txState.status).to.have.property("executed");
        const testPayeeAccount = await squads.connection.getParsedAccountInfo(
          testPayee.publicKey
        );
        expect(testPayeeAccount.value.lamports).to.equal(1000000);
      });

      it(`2X Transfer Tx Execute`, async function () {
        // create authority to use (Vault, index 1)
        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);

        // the test transfer instruction (2x)
        const testPayee = anchor.web3.Keypair.generate();
        const testIx = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey
        );
        const testIx2x = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey
        );

        let txState = await squads.createTransaction(msPDA, 1);
        await squads.addInstruction(txState.publicKey, testIx);
        await squads.addInstruction(txState.publicKey, testIx2x);
        await squads.activateTransaction(txState.publicKey);
        await squads.approveTransaction(txState.publicKey);

        // move funds to auth/vault
        const moveFundsToMsPDAIx = await createTestTransferTransaction(
          creator.publicKey,
          authorityPDA,
          3000000
        );

        const moveFundsToMsPDATx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
        await provider.sendAndConfirm(moveFundsToMsPDATx);
        const msPDAFunded = await squads.connection.getAccountInfo(
          authorityPDA
        );
        expect(msPDAFunded.lamports).to.equal(4000000);

        await squads.executeTransaction(txState.publicKey);

        txState = await squads.getTransaction(txState.publicKey);
        expect(txState.status).to.have.property("executed");
        let testPayeeAccount = await squads.connection.getParsedAccountInfo(
          testPayee.publicKey
        );
        expect(testPayeeAccount.value.lamports).to.equal(2000000);
      });

      it(`2X Transfer Tx Sequential execute`, async function () {
        // create authority to use (Vault, index 1)
        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);

        let txState = await squads.createTransaction(msPDA, 1);

        // person/entity who gets paid
        const testPayee = anchor.web3.Keypair.generate();

        ////////////////////////////////////////////////////////
        // add the first transfer

        // the test transfer instruction
        const testIx = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey
        );

        let ixState = await squads.addInstruction(txState.publicKey, testIx);

        //////////////////////////////////////////////////////////
        // add the second transfer ix

        const testIx2x = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey
        );
        let ix2State = await squads.addInstruction(txState.publicKey, testIx2x);
        await squads.activateTransaction(txState.publicKey);
        await squads.approveTransaction(txState.publicKey);

        // move funds to auth/vault
        const moveFundsToMsPDAIx = await createTestTransferTransaction(
          creator.publicKey,
          authorityPDA,
          3000000
        );
        const moveFundsToMsPDATx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
        await provider.sendAndConfirm(moveFundsToMsPDATx);
        const msPDAFunded = await squads.connection.getAccountInfo(
          authorityPDA
        );
        // expect the vault to be correct:
        expect(msPDAFunded.lamports).to.equal(5000000);
        // lead with the expected program account, follow with the other accounts for the ix
        await squads.executeInstruction(txState.publicKey, ixState.publicKey);
        ixState = await squads.getInstruction(ixState.publicKey);
        txState = await squads.getTransaction(txState.publicKey);

        expect(ixState.executed).to.be.true;
        expect(txState.executedIndex).to.equal(1);

        await squads.executeInstruction(txState.publicKey, ix2State.publicKey);

        ix2State = await squads.getInstruction(ix2State.publicKey);
        txState = await squads.getTransaction(txState.publicKey);

        expect(ix2State.executed).to.be.true;
        expect(txState.executedIndex).to.equal(2);
        expect(txState.status).to.have.property("executed");
      });

      it(`Change ms size with realloc`, async function () {
        let msAccount = await squads.connection.getParsedAccountInfo(msPDA);
        const startRentLamports = msAccount.value.lamports;

        // 1 get the instruction to create a transction
        // 2 get the instruction to add a member
        // 3 get the instruction to 'activate' the tx
        // 4 send over the transaction to the ms program with 1 - 3
        // use 0 as authority index
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withAddMember(member2.publicKey)
        ).getInstructions();
        const activateIx = await squads.buildActivateTransaction(msPDA, txPDA);

        let addMemberTx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        addMemberTx.add(...txInstructions);
        addMemberTx.add(activateIx);

        await provider.sendAndConfirm(addMemberTx);

        await squads.approveTransaction(txPDA);

        let txState = await squads.getTransaction(txPDA);
        expect(txState.status).has.property("executeReady");

        await squads.executeTransaction(txPDA);

        const msState = await squads.getMultisig(msPDA);
        msAccount = await program.provider.connection.getParsedAccountInfo(
          msPDA
        );
        const endRentLamports = msAccount.value.lamports;
        expect((msState.keys as any[]).length).to.equal(
          numberOfMembersTotal + 1
        );
        expect(endRentLamports).to.be.greaterThan(startRentLamports);
      });

      it(`Add a new member but creator is not executor`, async function () {
        // 1 get the instruction to create a transaction
        // 2 get the instruction to add a member
        // 3 get the instruction to 'activate' the tx
        // 4 send over the transaction to the ms program with 1 - 3
        // use 0 as authority index
        const newMember = anchor.web3.Keypair.generate().publicKey;
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withAddMember(newMember)
        ).getInstructions();
        const activateIx = await squads.buildActivateTransaction(msPDA, txPDA);

        let addMemberTx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        addMemberTx.add(...txInstructions);
        addMemberTx.add(activateIx);

        await provider.sendAndConfirm(addMemberTx);

        await squads.approveTransaction(txPDA);

        let txState = await squads.getTransaction(txPDA);
        expect(txState.status).has.property("executeReady");

        await squads.executeTransaction(txPDA, member2.publicKey, [member2]);

        const msState = await squads.getMultisig(msPDA);
        expect((msState.keys as any[]).length).to.equal(
          numberOfMembersTotal + 2
        );
      });

      it(`Transaction instruction failure`, async function () {
        // create authority to use (Vault, index 1)
        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);
        let txState = await squads.createTransaction(msPDA, 1);

        // the test transfer instruction
        const testPayee = anchor.web3.Keypair.generate();
        const testIx = await createTestTransferTransaction(
          authorityPDA,
          testPayee.publicKey,
          anchor.web3.LAMPORTS_PER_SOL * 100
        );

        // add the instruction to the transaction
        await squads.addInstruction(txState.publicKey, testIx);
        await squads.activateTransaction(txState.publicKey);
        await squads.approveTransaction(txState.publicKey);

        try {
          await squads.executeTransaction(txState.publicKey);
        } catch (e) {
          // :(
          expect(e.message).to.include("failed");
        }

        txState = await squads.getTransaction(txState.publicKey);
        expect(txState.status).to.have.property("executeReady");
      });

      it(`Change threshold test`, async function () {
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withChangeThreshold(2)
        ).getInstructions();
        const emptyTx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        emptyTx.add(...txInstructions);
        await provider.sendAndConfirm(emptyTx);

        // get the ix
        let ixState = await squads.getInstruction(
          getIxPDA(txPDA, new BN(1, 10), squads.multisigProgramId)[0]
        );
        expect(ixState.instructionIndex).to.equal(1);

        // activate the tx
        let txState = await squads.activateTransaction(txPDA);
        expect(txState.status).to.have.property("active");

        // approve the tx
        await squads.approveTransaction(txPDA);

        // get the TX
        txState = await squads.getTransaction(txPDA);
        expect(txState.status).to.have.property("executeReady");

        // execute the tx
        txState = await squads.executeTransaction(txPDA);
        const msState = await squads.getMultisig(msPDA);

        expect(msState.threshold).to.equal(2);
        expect(txState.status).to.have.property("executed");
        threshold = msState.threshold;
      });

      it(`Insufficient approval failure`, async function () {
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withChangeThreshold(2)
        ).executeInstructions();

        // get the ix
        let ixState = await squads.getInstruction(
          getIxPDA(txPDA, new BN(1, 10), squads.multisigProgramId)[0]
        );
        expect(ixState.instructionIndex).to.equal(1);

        // activate the tx
        let txState = await squads.activateTransaction(txPDA);
        expect(txState.status).to.have.property("active");

        // approve the tx
        await squads.approveTransaction(txPDA);

        // execute the tx
        try {
          await squads.executeTransaction(txPDA);
        } catch (e) {
          expect(e.message).to.contain("Error processing Instruction");
        }
      });

      it(`Change vote from approved to rejected`, async function () {
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withChangeThreshold(2)
        ).executeInstructions();

        // get the ix
        let ixState = await squads.getInstruction(
          getIxPDA(txPDA, new BN(1, 10), squads.multisigProgramId)[0]
        );
        expect(ixState.instructionIndex).to.equal(1);

        // activate the tx
        let txState = await squads.activateTransaction(txPDA);
        expect(txState.status).to.have.property("active");

        // approve the tx
        txState = await squads.approveTransaction(txPDA);

        // check that state is "approved"
        expect(txState.status).to.have.property("active");
        expect(
          txState.approved
            .map((k) => k.toBase58())
            .indexOf(creator.publicKey.toBase58())
        ).is.greaterThanOrEqual(0);

        // now reject
        txState = await squads.rejectTransaction(txPDA);
        expect(txState.status).to.have.property("active");
        expect(
          txState.rejected
            .map((k) => k.toBase58())
            .indexOf(creator.publicKey.toBase58())
        ).is.greaterThanOrEqual(0);
        expect(
          txState.approved
            .map((k) => k.toBase58())
            .indexOf(creator.publicKey.toBase58())
        ).is.lessThan(0);
      });

      it(`Add a new member & change threshold (conjoined)`, async function () {
        const newMember = anchor.web3.Keypair.generate().publicKey;
        const txBuilder = await squads.getTransactionBuilder(msPDA, 0);
        const [txInstructions, txPDA] = await (
          await txBuilder.withAddMemberAndChangeThreshold(newMember, 1)
        ).getInstructions();
        const activateIx = await squads.buildActivateTransaction(msPDA, txPDA);

        let addMemberTx = await createBlankTransaction(
          squads.connection,
          creator.publicKey
        );
        addMemberTx.add(...txInstructions);
        addMemberTx.add(activateIx);

        await provider.sendAndConfirm(addMemberTx);
        let msState = await squads.getMultisig(msPDA);
        // get necessary signers
        // if the threshold has changed, use the other members to approve as well
        for (let i = 0; i < memberList.length; i++) {
          // check to see if we need more signers
          const approvalState = await squads.getTransaction(txPDA);
          if (Object.keys(approvalState.status).indexOf("active") < 0) {
            break;
          }

          const inMultisig = (
            msState.keys as anchor.web3.PublicKey[]
          ).findIndex((k) => {
            return k.toBase58() == memberList[i].publicKey.toBase58();
          });
          if (inMultisig < 0) {
            continue;
          }
          try {
            await provider.connection.requestAirdrop(
              memberList[i].publicKey,
              anchor.web3.LAMPORTS_PER_SOL
            );
            const approveTx = await program.methods
              .approveTransaction()
              .accounts({
                multisig: msPDA,
                transaction: txPDA,
                member: memberList[i].publicKey,
              })
              .signers([memberList[i]])
              .transaction();
            try {
              await provider.sendAndConfirm(approveTx, [memberList[i]]);
            } catch (e) {
              console.log(memberList[i].publicKey.toBase58(), " signing error");
            }
          } catch (e) {
            console.log(e);
          }
        }

        let txState = await squads.getTransaction(txPDA);
        expect(txState.status).has.property("executeReady");

        const payer = memberList[4];
        await provider.connection.requestAirdrop(
          payer.publicKey,
          anchor.web3.LAMPORTS_PER_SOL
        );
        await squads.executeTransaction(txPDA, payer.publicKey, [payer]);
        txState = await squads.getTransaction(txPDA);
        expect(txState.status).has.property("executed");
        msState = await squads.getMultisig(msPDA);
        threshold = msState.threshold;
        expect((msState.keys as any[]).length).to.equal(
          numberOfMembersTotal + 3
        );
        expect(msState.threshold).to.equal(1);
      });
    });
  });
});
