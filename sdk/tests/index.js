"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const index_1 = __importDefault(require("../src/index"));
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@project-serum/anchor");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const DEFAULT_MULTISIG_PROGRAM_ID = new web3_js_1.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu");
const DEFAULT_PROGRAM_MANAGER_PROGRAM_ID = new web3_js_1.PublicKey("SMPLKTQhrgo22hFCVq2VGX1KAktTWjeizkhrdB1eauK");
(0, mocha_1.describe)("Squads SDK", () => {
    const keypair = anchor_1.web3.Keypair.generate();
    const wallet = new nodewallet_1.default(keypair);
    console.log("**** TESTING SQUADS SDK ****");
    (0, mocha_1.describe)("Basic Functionality", () => {
        it("Constructs Squads object", () => {
            const squad = index_1.default.localnet(wallet);
            (0, chai_1.expect)(squad.connection.rpcEndpoint).to.equal("http://localhost:8899");
            (0, chai_1.assert)(squad.multisigProgramId.equals(DEFAULT_MULTISIG_PROGRAM_ID));
            (0, chai_1.assert)(squad.programManagerProgramId.equals(DEFAULT_PROGRAM_MANAGER_PROGRAM_ID));
        });
    });
});
