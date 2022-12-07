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
exports.getRolesManager = exports.getUserDelegatePDA = exports.getUserRolePDA = exports.getExecuteProxyInstruction = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const sdk_1 = require("@sqds/sdk");
function getExecuteProxyInstruction(transactionPDA, member, user, delegate, squadsMplProgram, rolesProgram) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = yield squadsMplProgram.account.msTransaction.fetch(transactionPDA);
        const ixList = yield Promise.all([...new Array(transaction.instructionIndex)].map((a, i) => __awaiter(this, void 0, void 0, function* () {
            const ixIndexBN = new anchor.BN(i + 1, 10);
            const [ixKey] = (0, sdk_1.getIxPDA)(transactionPDA, ixIndexBN, squadsMplProgram.programId);
            const ixAccount = yield squadsMplProgram.account.msInstruction.fetch(ixKey);
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
                        pubkey: member,
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
        const executeIx = yield rolesProgram.methods.executeTxProxy(Buffer.from(keyIndexMap))
            .accounts({
            multisig: transaction.ms,
            transaction: transactionPDA,
            member,
            user,
            delegate,
            squadsProgram: squadsMplProgram.programId,
        })
            .instruction();
        executeIx.keys = executeIx.keys.concat(keysUnique);
        return executeIx;
    });
}
exports.getExecuteProxyInstruction = getExecuteProxyInstruction;
const getUserRolePDA = (msPDA, roleIndex, programId) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor.web3.PublicKey.findProgramAddress([
        anchor.utils.bytes.utf8.encode("squad"),
        msPDA.toBuffer(),
        roleIndex.toArrayLike(Buffer, "le", 4),
        anchor.utils.bytes.utf8.encode("user-role")
    ], programId);
});
exports.getUserRolePDA = getUserRolePDA;
const getUserDelegatePDA = (rolePDA, userKey, programId) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor.web3.PublicKey.findProgramAddress([
        anchor.utils.bytes.utf8.encode("squad"),
        rolePDA.toBuffer(),
        userKey.toBuffer(),
        anchor.utils.bytes.utf8.encode("delegate")
    ], programId);
});
exports.getUserDelegatePDA = getUserDelegatePDA;
const getRolesManager = (msPDA, programId) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor.web3.PublicKey.findProgramAddress([
        anchor.utils.bytes.utf8.encode("squad"),
        msPDA.toBuffer(),
        anchor.utils.bytes.utf8.encode("roles-manager")
    ], programId);
});
exports.getRolesManager = getRolesManager;
