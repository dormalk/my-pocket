import {describe,expect,it} from "vitest";
import {appendEntry,balanceOf,type LedgerEntry} from "../src/ledger.js";
const entry:LedgerEntry={id:"1",familyId:"f",childId:"c",purse:"expenses",kind:"cash_request_paid",amount:500,occurredAt:"2026-01-01T00:00:00Z",idempotencyKey:"once"};
describe("append-only ledger",()=>{
 it("derives a purse balance from signed entries",()=>expect(balanceOf([entry,{...entry,id:"2",kind:"expense",amount:-125,idempotencyKey:"two"}],"c","expenses")).toBe(375));
 it("rejects duplicate idempotency keys",()=>expect(()=>appendEntry([entry],{...entry,id:"2"})).toThrow());
 it("rejects non-negative expense entries",()=>expect(()=>appendEntry([],{...entry,kind:"expense"})).toThrow());
});
