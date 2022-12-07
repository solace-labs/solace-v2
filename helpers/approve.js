"use strict";
// approve helper for test suite
// runs through a multisig we pre-specified member list to approve a transaction
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
exports.memberListApprove = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const memberListApprove = (memberList, msPDA, txPDA, squads, provider, program) => __awaiter(void 0, void 0, void 0, function* () {
    let msState = yield program.account.ms.fetch(msPDA);
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
});
exports.memberListApprove = memberListApprove;
