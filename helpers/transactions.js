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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTransaction = exports.createBlankTransaction = exports.createTestTransferTransaction = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const sdk_1 = require("@sqds/sdk");
// some TX/IX helper functions
const createTestTransferTransaction = (authority, recipient, amount = 1000000) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor.web3.SystemProgram.transfer({
        fromPubkey: authority,
        lamports: amount,
        toPubkey: recipient,
    });
});
exports.createTestTransferTransaction = createTestTransferTransaction;
const createBlankTransaction = (connection, feePayer) => __awaiter(void 0, void 0, void 0, function* () {
    const { blockhash } = yield connection.getLatestBlockhash();
    const lastValidBlockHeight = yield connection.getBlockHeight();
    return new anchor.web3.Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer,
    });
});
exports.createBlankTransaction = createBlankTransaction;
function _executeTransaction(transactionPDA, feePayer, program) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = yield program.account.msTransaction.fetch(transactionPDA);
        const ixList = yield Promise.all([...new Array(transaction.instructionIndex)].map((a, i) => __awaiter(this, void 0, void 0, function* () {
            const ixIndexBN = new anchor.BN(i + 1, 10);
            const [ixKey] = (0, sdk_1.getIxPDA)(transactionPDA, ixIndexBN, program.programId);
            const ixAccount = yield program.account.msInstruction.fetch(ixKey);
            return { pubkey: ixKey, ixItem: ixAccount };
        })));
        const ixKeysList = ixList
            .map(({ pubkey, ixItem }) => {
            const ixKeys = ixItem.keys;
            const addSig = anchor.utils.sha256.hash("global:add_member");
            const ixDiscriminator = Buffer.from(addSig, "hex");
            const addData = Buffer.concat([ixDiscriminator.slice(0, 8)]);
            const addAndThreshSig = anchor.utils.sha256.hash("global:add_member_and_change_threshold");
            const ixAndThreshDiscriminator = Buffer.from(addAndThreshSig, "hex");
            const addAndThreshData = Buffer.concat([
                ixAndThreshDiscriminator.slice(0, 8),
            ]);
            const ixData = ixItem.data;
            const formattedKeys = ixKeys.map((ixKey, keyInd) => {
                if ((ixData.includes(addData) || ixData.includes(addAndThreshData)) &&
                    keyInd === 2) {
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
        const keysUnique = ixKeysList.reduce((prev, curr) => {
            const inList = prev.findIndex((a) => a.pubkey.toBase58() === curr.pubkey.toBase58());
            // if its already in the list, and has same write flag
            if (inList >= 0 && prev[inList].isWritable === curr.isWritable) {
                return prev;
            }
            else {
                prev.push({
                    pubkey: curr.pubkey,
                    isWritable: curr.isWritable,
                    isSigner: curr.isSigner,
                });
                return prev;
            }
        }, []);
        const keyIndexMap = ixKeysList.map((a) => {
            return keysUnique.findIndex((k) => k.pubkey.toBase58() === a.pubkey.toBase58() &&
                k.isWritable === a.isWritable);
        });
        const executeIx = yield program.methods
            .executeTransaction(Buffer.from(keyIndexMap))
            .accounts({
            multisig: transaction.ms,
            transaction: transactionPDA,
            member: feePayer,
        })
            .instruction();
        executeIx.keys = executeIx.keys.concat(keysUnique);
        return executeIx;
    });
}
function executeTransaction(transactionPDA, wallet, provider, program, feePayer, signers) {
    return __awaiter(this, void 0, void 0, function* () {
        const payer = feePayer !== null && feePayer !== void 0 ? feePayer : wallet.publicKey;
        const executeIx = yield _executeTransaction(transactionPDA, payer, program);
        const { blockhash } = yield provider.connection.getLatestBlockhash();
        const lastValidBlockHeight = yield provider.connection.getBlockHeight();
        const executeTx = new anchor.web3.Transaction({
            blockhash,
            lastValidBlockHeight,
            feePayer: payer,
        });
        executeTx.add(executeIx);
        return provider.sendAndConfirm(executeTx, signers);
    });
}
exports.executeTransaction = executeTransaction;
