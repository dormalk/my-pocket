import {describe,expect,it} from "vitest";
import {calculateMonthlyInterest} from "../src/interest.js";
describe("monthly interest",()=>{it("uses leap-year denominator",()=>expect(calculateMonthlyInterest([{date:"2024-02-01",closingBalanceAgorot:100000}],365).unroundedAgorot).toBeCloseTo(100));it("rounds at monthly credit",()=>expect(calculateMonthlyInterest([{date:"2025-01-01",closingBalanceAgorot:10000}],500).amountAgorot).toBe(1));it("allows zero percent",()=>expect(calculateMonthlyInterest([{date:"2025-01-01",closingBalanceAgorot:99999}],0).amountAgorot).toBe(0));});
