"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const anchor = __importStar(require("@project-serum/anchor"));
const transactions_1 = require("../helpers/transactions");
const child_process_1 = require("child_process");
const sdk_1 = __importStar(require("@sqds/sdk"));
const bn_js_1 = __importDefault(require("bn.js"));
const BPF_UPGRADE_ID = new anchor.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const deploySmpl = () => {
    const deployCmd = `solana program deploy --url localhost -v --program-id $(pwd)/target/deploy/squads_mpl-keypair.json $(pwd)/target/deploy/squads_mpl.so`;
    (0, child_process_1.execSync)(deployCmd);
};
// will deploy a buffer for the program manager program
const writeBuffer = (bufferKeypair) => {
    const writeCmd = `solana program write-buffer --buffer ${bufferKeypair} --url localhost -v $(pwd)/target/deploy/program_manager.so`;
    (0, child_process_1.execSync)(writeCmd);
};
const setBufferAuthority = (bufferAddress, authority) => {
    const authCmd = `solana program set-buffer-authority --url localhost ${bufferAddress.toBase58()} --new-buffer-authority ${authority.toBase58()}`;
    (0, child_process_1.execSync)(authCmd);
};
const setProgramAuthority = (programAddress, authority) => {
    try {
        const logsCmd = `solana program show --url localhost --programs`;
        (0, child_process_1.execSync)(logsCmd, { stdio: "inherit" });
        const authCmd = `solana program set-upgrade-authority --url localhost ${programAddress.toBase58()} --new-upgrade-authority ${authority.toBase58()}`;
        (0, child_process_1.execSync)(authCmd, { stdio: "inherit" });
    }
    catch (e) {
        console.log(e);
        throw new Error(e);
    }
};
const getIxAuthority = (txPda, index, programId) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor.web3.PublicKey.findProgramAddress([
        anchor.utils.bytes.utf8.encode("squad"),
        txPda.toBuffer(),
        index.toArrayLike(Buffer, "le", 4),
        anchor.utils.bytes.utf8.encode("ix_authority"),
    ], programId);
});
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
        let pmPDA;
        let member2;
        let rolesProgram;
        const numberOfMembersTotal = 10;
        const memberList = [...new Array(numberOfMembersTotal - 1)].map(() => {
            return anchor.web3.Keypair.generate();
        });
        let threshold = 1;
        // test suite
        describe("SMPL Basic functionality", function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.beforeAll(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        console.log("Deploying programs...");
                        deploySmpl();
                        console.log("✔ SMPL Program deployed.");
                        program = anchor.workspace.SquadsMpl;
                        squads = sdk_1.default.localnet(provider.wallet, {
                            commitmentOrConfig: provider.connection.commitment,
                            multisigProgramId: anchor.workspace.SquadsMpl.programId,
                            programManagerProgramId: anchor.workspace.ProgramManager.programId,
                        });
                        // the program-manager program / provider
                        creator = program.provider.wallet;
                        // the Multisig PDA to use for the test run
                        randomCreateKey = anchor.web3.Keypair.generate().publicKey;
                        [msPDA] = (0, sdk_1.getMsPDA)(randomCreateKey, squads.multisigProgramId);
                        [pmPDA] = (0, sdk_1.getProgramManagerPDA)(msPDA, squads.programManagerProgramId);
                        member2 = anchor.web3.Keypair.generate();
                    });
                });
                it(`Create Multisig`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield squads.createMultisig(threshold, randomCreateKey, memberList.map((m) => m.publicKey));
                        const vaultPDA = squads.getAuthorityPDA(msPDA, 1);
                        const fundingTx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        const fundingIx = yield (0, transactions_1.createTestTransferTransaction)(creator.publicKey, vaultPDA, 0.001 * 1000000000);
                        fundingTx.add(fundingIx);
                        yield provider.sendAndConfirm(fundingTx);
                        let msState = yield squads.getMultisig(msPDA);
                        (0, chai_1.expect)(msState.threshold).to.equal(1);
                        (0, chai_1.expect)(msState.transactionIndex).to.equal(0);
                        (0, chai_1.expect)(msState.keys.length).to.equal(numberOfMembersTotal);
                        const vaultAccount = yield squads.connection.getParsedAccountInfo(vaultPDA);
                        (0, chai_1.expect)(vaultAccount.value.lamports).to.equal(0.001 * 1000000000);
                    });
                });
                it(`Create Tx draft`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create a transaction draft
                        const txState = yield squads.createTransaction(msPDA, 1);
                        (0, chai_1.expect)(txState.instructionIndex).to.equal(0);
                        (0, chai_1.expect)(txState.creator.toBase58()).to.equal(creator.publicKey.toBase58());
                        // check the transaction indexes match
                        const msState = yield squads.getMultisig(msPDA);
                        (0, chai_1.expect)(txState.transactionIndex).to.equal(msState.transactionIndex);
                    });
                });
                it(`Add Ix to Tx`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create a transaction draft
                        let txState = yield squads.createTransaction(msPDA, 1);
                        // check the transaction indexes match
                        (0, chai_1.expect)(txState.instructionIndex).to.equal(0);
                        (0, chai_1.expect)(txState.status).to.have.property("draft");
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(msPDA, creator.publicKey);
                        const ixState = yield squads.addInstruction(txState.publicKey, testIx);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(ixState.instructionIndex).to.equal(1);
                        (0, chai_1.expect)(txState.instructionIndex).to.equal(1);
                    });
                });
                it(`Tx Activate`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create a transaction draft
                        let txState = yield squads.createTransaction(msPDA, 1);
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(msPDA, creator.publicKey);
                        let ixState = yield squads.addInstruction(txState.publicKey, testIx);
                        yield squads.activateTransaction(txState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        ixState = yield squads.getInstruction(ixState.publicKey);
                        (0, chai_1.expect)(ixState.programId.toBase58()).to.equal(testIx.programId.toBase58());
                    });
                });
                it(`Tx Sign`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create a transaction draft
                        let txState = yield squads.createTransaction(msPDA, 1);
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(msPDA, creator.publicKey);
                        yield squads.addInstruction(txState.publicKey, testIx);
                        yield squads.activateTransaction(txState.publicKey);
                        yield squads.approveTransaction(txState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.approved.length).to.equal(1);
                        (0, chai_1.expect)(txState.status).to.have.property("executeReady");
                    });
                });
                it(`Transfer Tx Execute`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create authority to use (Vault, index 1)
                        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);
                        // the test transfer instruction
                        const testPayee = anchor.web3.Keypair.generate();
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey);
                        let txState = yield squads.createTransaction(msPDA, 1);
                        yield squads.addInstruction(txState.publicKey, testIx);
                        yield squads.activateTransaction(txState.publicKey);
                        yield squads.approveTransaction(txState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.status).to.have.property("executeReady");
                        // move funds to auth/vault
                        const moveFundsToMsPDATx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        const moveFundsToMsPDAIx = yield (0, transactions_1.createTestTransferTransaction)(creator.publicKey, authorityPDA);
                        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
                        yield provider.sendAndConfirm(moveFundsToMsPDATx);
                        const authorityPDAFunded = yield squads.connection.getAccountInfo(authorityPDA);
                        (0, chai_1.expect)(authorityPDAFunded.lamports).to.equal(2000000);
                        yield squads.executeTransaction(txState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.status).to.have.property("executed");
                        const testPayeeAccount = yield squads.connection.getParsedAccountInfo(testPayee.publicKey);
                        (0, chai_1.expect)(testPayeeAccount.value.lamports).to.equal(1000000);
                    });
                });
                it(`2X Transfer Tx Execute`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create authority to use (Vault, index 1)
                        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);
                        // the test transfer instruction (2x)
                        const testPayee = anchor.web3.Keypair.generate();
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey);
                        const testIx2x = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey);
                        let txState = yield squads.createTransaction(msPDA, 1);
                        yield squads.addInstruction(txState.publicKey, testIx);
                        yield squads.addInstruction(txState.publicKey, testIx2x);
                        yield squads.activateTransaction(txState.publicKey);
                        yield squads.approveTransaction(txState.publicKey);
                        // move funds to auth/vault
                        const moveFundsToMsPDAIx = yield (0, transactions_1.createTestTransferTransaction)(creator.publicKey, authorityPDA, 3000000);
                        const moveFundsToMsPDATx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
                        yield provider.sendAndConfirm(moveFundsToMsPDATx);
                        const msPDAFunded = yield squads.connection.getAccountInfo(authorityPDA);
                        (0, chai_1.expect)(msPDAFunded.lamports).to.equal(4000000);
                        yield squads.executeTransaction(txState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.status).to.have.property("executed");
                        let testPayeeAccount = yield squads.connection.getParsedAccountInfo(testPayee.publicKey);
                        (0, chai_1.expect)(testPayeeAccount.value.lamports).to.equal(2000000);
                    });
                });
                it(`2X Transfer Tx Sequential execute`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create authority to use (Vault, index 1)
                        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);
                        let txState = yield squads.createTransaction(msPDA, 1);
                        // person/entity who gets paid
                        const testPayee = anchor.web3.Keypair.generate();
                        ////////////////////////////////////////////////////////
                        // add the first transfer
                        // the test transfer instruction
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey);
                        let ixState = yield squads.addInstruction(txState.publicKey, testIx);
                        //////////////////////////////////////////////////////////
                        // add the second transfer ix
                        const testIx2x = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey);
                        let ix2State = yield squads.addInstruction(txState.publicKey, testIx2x);
                        yield squads.activateTransaction(txState.publicKey);
                        yield squads.approveTransaction(txState.publicKey);
                        // move funds to auth/vault
                        const moveFundsToMsPDAIx = yield (0, transactions_1.createTestTransferTransaction)(creator.publicKey, authorityPDA, 3000000);
                        const moveFundsToMsPDATx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        moveFundsToMsPDATx.add(moveFundsToMsPDAIx);
                        yield provider.sendAndConfirm(moveFundsToMsPDATx);
                        const msPDAFunded = yield squads.connection.getAccountInfo(authorityPDA);
                        // expect the vault to be correct:
                        (0, chai_1.expect)(msPDAFunded.lamports).to.equal(5000000);
                        // lead with the expected program account, follow with the other accounts for the ix
                        yield squads.executeInstruction(txState.publicKey, ixState.publicKey);
                        ixState = yield squads.getInstruction(ixState.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(ixState.executed).to.be.true;
                        (0, chai_1.expect)(txState.executedIndex).to.equal(1);
                        yield squads.executeInstruction(txState.publicKey, ix2State.publicKey);
                        ix2State = yield squads.getInstruction(ix2State.publicKey);
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(ix2State.executed).to.be.true;
                        (0, chai_1.expect)(txState.executedIndex).to.equal(2);
                        (0, chai_1.expect)(txState.status).to.have.property("executed");
                    });
                });
                it(`Change ms size with realloc`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        let msAccount = yield squads.connection.getParsedAccountInfo(msPDA);
                        const startRentLamports = msAccount.value.lamports;
                        // 1 get the instruction to create a transction
                        // 2 get the instruction to add a member
                        // 3 get the instruction to 'activate' the tx
                        // 4 send over the transaction to the ms program with 1 - 3
                        // use 0 as authority index
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withAddMember(member2.publicKey)).getInstructions();
                        const activateIx = yield squads.buildActivateTransaction(msPDA, txPDA);
                        let addMemberTx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        addMemberTx.add(...txInstructions);
                        addMemberTx.add(activateIx);
                        yield provider.sendAndConfirm(addMemberTx);
                        yield squads.approveTransaction(txPDA);
                        let txState = yield squads.getTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).has.property("executeReady");
                        yield squads.executeTransaction(txPDA);
                        const msState = yield squads.getMultisig(msPDA);
                        msAccount = yield program.provider.connection.getParsedAccountInfo(msPDA);
                        const endRentLamports = msAccount.value.lamports;
                        (0, chai_1.expect)(msState.keys.length).to.equal(numberOfMembersTotal + 1);
                        (0, chai_1.expect)(endRentLamports).to.be.greaterThan(startRentLamports);
                    });
                });
                it(`Add a new member but creator is not executor`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // 1 get the instruction to create a transaction
                        // 2 get the instruction to add a member
                        // 3 get the instruction to 'activate' the tx
                        // 4 send over the transaction to the ms program with 1 - 3
                        // use 0 as authority index
                        const newMember = anchor.web3.Keypair.generate().publicKey;
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withAddMember(newMember)).getInstructions();
                        const activateIx = yield squads.buildActivateTransaction(msPDA, txPDA);
                        let addMemberTx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        addMemberTx.add(...txInstructions);
                        addMemberTx.add(activateIx);
                        yield provider.sendAndConfirm(addMemberTx);
                        yield squads.approveTransaction(txPDA);
                        let txState = yield squads.getTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).has.property("executeReady");
                        yield squads.executeTransaction(txPDA, member2.publicKey, [member2]);
                        const msState = yield squads.getMultisig(msPDA);
                        (0, chai_1.expect)(msState.keys.length).to.equal(numberOfMembersTotal + 2);
                    });
                });
                it(`Transaction instruction failure`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // create authority to use (Vault, index 1)
                        const authorityPDA = squads.getAuthorityPDA(msPDA, 1);
                        let txState = yield squads.createTransaction(msPDA, 1);
                        // the test transfer instruction
                        const testPayee = anchor.web3.Keypair.generate();
                        const testIx = yield (0, transactions_1.createTestTransferTransaction)(authorityPDA, testPayee.publicKey, anchor.web3.LAMPORTS_PER_SOL * 100);
                        // add the instruction to the transaction
                        yield squads.addInstruction(txState.publicKey, testIx);
                        yield squads.activateTransaction(txState.publicKey);
                        yield squads.approveTransaction(txState.publicKey);
                        try {
                            yield squads.executeTransaction(txState.publicKey);
                        }
                        catch (e) {
                            // :(
                            (0, chai_1.expect)(e.message).to.include("failed");
                        }
                        txState = yield squads.getTransaction(txState.publicKey);
                        (0, chai_1.expect)(txState.status).to.have.property("executeReady");
                    });
                });
                it(`Change threshold test`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withChangeThreshold(2)).getInstructions();
                        const emptyTx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        emptyTx.add(...txInstructions);
                        yield provider.sendAndConfirm(emptyTx);
                        // get the ix
                        let ixState = yield squads.getInstruction((0, sdk_1.getIxPDA)(txPDA, new bn_js_1.default(1, 10), squads.multisigProgramId)[0]);
                        (0, chai_1.expect)(ixState.instructionIndex).to.equal(1);
                        // activate the tx
                        let txState = yield squads.activateTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        // approve the tx
                        yield squads.approveTransaction(txPDA);
                        // get the TX
                        txState = yield squads.getTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).to.have.property("executeReady");
                        // execute the tx
                        txState = yield squads.executeTransaction(txPDA);
                        const msState = yield squads.getMultisig(msPDA);
                        (0, chai_1.expect)(msState.threshold).to.equal(2);
                        (0, chai_1.expect)(txState.status).to.have.property("executed");
                        threshold = msState.threshold;
                    });
                });
                it(`Insufficient approval failure`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withChangeThreshold(2)).executeInstructions();
                        // get the ix
                        let ixState = yield squads.getInstruction((0, sdk_1.getIxPDA)(txPDA, new bn_js_1.default(1, 10), squads.multisigProgramId)[0]);
                        (0, chai_1.expect)(ixState.instructionIndex).to.equal(1);
                        // activate the tx
                        let txState = yield squads.activateTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        // approve the tx
                        yield squads.approveTransaction(txPDA);
                        // execute the tx
                        try {
                            yield squads.executeTransaction(txPDA);
                        }
                        catch (e) {
                            (0, chai_1.expect)(e.message).to.contain("Error processing Instruction");
                        }
                    });
                });
                it(`Change vote from approved to rejected`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withChangeThreshold(2)).executeInstructions();
                        // get the ix
                        let ixState = yield squads.getInstruction((0, sdk_1.getIxPDA)(txPDA, new bn_js_1.default(1, 10), squads.multisigProgramId)[0]);
                        (0, chai_1.expect)(ixState.instructionIndex).to.equal(1);
                        // activate the tx
                        let txState = yield squads.activateTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        // approve the tx
                        txState = yield squads.approveTransaction(txPDA);
                        // check that state is "approved"
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        (0, chai_1.expect)(txState.approved
                            .map((k) => k.toBase58())
                            .indexOf(creator.publicKey.toBase58())).is.greaterThanOrEqual(0);
                        // now reject
                        txState = yield squads.rejectTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).to.have.property("active");
                        (0, chai_1.expect)(txState.rejected
                            .map((k) => k.toBase58())
                            .indexOf(creator.publicKey.toBase58())).is.greaterThanOrEqual(0);
                        (0, chai_1.expect)(txState.approved
                            .map((k) => k.toBase58())
                            .indexOf(creator.publicKey.toBase58())).is.lessThan(0);
                    });
                });
                it(`Add a new member & change threshold (conjoined)`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const newMember = anchor.web3.Keypair.generate().publicKey;
                        const txBuilder = yield squads.getTransactionBuilder(msPDA, 0);
                        const [txInstructions, txPDA] = yield (yield txBuilder.withAddMemberAndChangeThreshold(newMember, 1)).getInstructions();
                        const activateIx = yield squads.buildActivateTransaction(msPDA, txPDA);
                        let addMemberTx = yield (0, transactions_1.createBlankTransaction)(squads.connection, creator.publicKey);
                        addMemberTx.add(...txInstructions);
                        addMemberTx.add(activateIx);
                        yield provider.sendAndConfirm(addMemberTx);
                        let msState = yield squads.getMultisig(msPDA);
                        // get necessary signers
                        // if the threshold has changed, use the other members to approve as well
                        for (let i = 0; i < memberList.length; i++) {
                            // check to see if we need more signers
                            const approvalState = yield squads.getTransaction(txPDA);
                            if (Object.keys(approvalState.status).indexOf("active") < 0) {
                                break;
                            }
                            const inMultisig = msState.keys.findIndex((k) => {
                                return k.toBase58() == memberList[i].publicKey.toBase58();
                            });
                            if (inMultisig < 0) {
                                continue;
                            }
                            try {
                                yield provider.connection.requestAirdrop(memberList[i].publicKey, anchor.web3.LAMPORTS_PER_SOL);
                                const approveTx = yield program.methods
                                    .approveTransaction()
                                    .accounts({
                                    multisig: msPDA,
                                    transaction: txPDA,
                                    member: memberList[i].publicKey,
                                })
                                    .signers([memberList[i]])
                                    .transaction();
                                try {
                                    yield provider.sendAndConfirm(approveTx, [memberList[i]]);
                                }
                                catch (e) {
                                    console.log(memberList[i].publicKey.toBase58(), " signing error");
                                }
                            }
                            catch (e) {
                                console.log(e);
                            }
                        }
                        let txState = yield squads.getTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).has.property("executeReady");
                        const payer = memberList[4];
                        yield provider.connection.requestAirdrop(payer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
                        yield squads.executeTransaction(txPDA, payer.publicKey, [payer]);
                        txState = yield squads.getTransaction(txPDA);
                        (0, chai_1.expect)(txState.status).has.property("executed");
                        msState = yield squads.getMultisig(msPDA);
                        threshold = msState.threshold;
                        (0, chai_1.expect)(msState.keys.length).to.equal(numberOfMembersTotal + 3);
                        (0, chai_1.expect)(msState.threshold).to.equal(1);
                    });
                });
            });
        });
    });
});
