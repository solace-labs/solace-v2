import { SquadsMpl } from "../../target/types/squads_mpl";
import { Idl, IdlTypes, MethodsNamespace } from "@project-serum/anchor";
import { IdlTypeDef } from "@project-serum/anchor/dist/cjs/idl";
import {
  AllInstructions,
  TypeDef,
} from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { PublicKey } from "@solana/web3.js";
import { MethodsBuilder } from "@project-serum/anchor/dist/cjs/program/namespace/methods";

// Copied (with slight modification) from @project-serum/anchor/src/program/namespace/types (not exported)
type TypeDefDictionary<T extends IdlTypeDef[], Defined> = {
  [K in T[number]["name"]]: TypeDef<T[number] & { name: K }, Defined> & {
    publicKey: PublicKey;
  };
};

type AccountDefDictionary<T extends Idl> = TypeDefDictionary<
  NonNullable<T["accounts"]>,
  IdlTypes<T>
>;

export type MultisigAccount = AccountDefDictionary<SquadsMpl>["ms"];
export type TransactionAccount =
  AccountDefDictionary<SquadsMpl>["msTransaction"];
export type InstructionAccount =
  AccountDefDictionary<SquadsMpl>["msInstruction"];

export type SquadsMethods = MethodsBuilder<
  SquadsMpl,
  AllInstructions<SquadsMpl>
>;
export type SquadsMethodsNamespace = MethodsNamespace<
  SquadsMpl,
  AllInstructions<SquadsMpl>
>;
