import {describe,expect,it} from "vitest";
import {calculateMonthlyInterest} from "../src/interest.js";
describe("monthly interest",()=>{
 it("uses leap-year denominator",()=>expect(calculateMonthlyInterest([{date:"2024-02-01",closingBalanceAgorot:100000}],365).unroundedAgorot).toBeCloseTo(9.9726775956));
 it("rounds only at monthly credit",()=>expect(calculateMonthlyInterest(Array.from({length:31},(_,i)=>({date:`2025-01-${String(i+1).padStart(2,"0")}`,closingBalanceAgorot:10000})),500).amountAgorot).toBe(42));
 it("allows zero percent",()=>expect(calculateMonthlyInterest([{date:"2025-01-01",closingBalanceAgorot:99999}],0).amountAgorot).toBe(0));
});
