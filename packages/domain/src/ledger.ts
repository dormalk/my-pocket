import { assertAgorot, type Agorot } from "./money.js";
export type Purse="expenses"|"savings"|"donation";
export type LedgerKind="income_allocation"|"expense"|"cash_request_paid"|"interest_credit"|"savings_goal_redeemed"|"donation_completed"|"reversal";
export type LedgerEntry=Readonly<{id:string;familyId:string;childId:string;purse:Purse;kind:LedgerKind;amount:Agorot;occurredAt:string;idempotencyKey:string;reversesEntryId?:string}>;
export function balanceOf(entries:readonly LedgerEntry[],childId:string,purse:Purse):Agorot { return entries.filter(e=>e.childId===childId&&e.purse===purse).reduce((sum,e)=>sum+e.amount,0); }
export function appendEntry(existing:readonly LedgerEntry[],entry:LedgerEntry):LedgerEntry[] { assertAgorot(entry.amount); if(existing.some(e=>e.idempotencyKey===entry.idempotencyKey)) throw new Error("התנועה כבר נרשמה"); return [...existing,Object.freeze({...entry})]; }
