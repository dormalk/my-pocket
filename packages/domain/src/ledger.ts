export type Purse="expenses"|"savings"|"donation";
export type LedgerKind="income_allocation"|"expense"|"cash_request_paid"|"interest_credit"|"savings_goal_redeemed"|"donation_completed"|"reversal";
export type LedgerEntry=Readonly<{id:string;familyId:string;childId:string;purse:Purse;kind:LedgerKind;amount:number;occurredAt:string;idempotencyKey:string;reversesEntryId?:string}>;

export function balanceOf(entries:readonly LedgerEntry[],childId:string,purse:Purse):number {
  return entries.filter(e=>e.childId===childId&&e.purse===purse).reduce((sum,e)=>sum+e.amount,0);
}

/** Signed agorot allow debits; the immutable history is corrected only with a new reversal entry. */
export function appendEntry(existing:readonly LedgerEntry[],entry:LedgerEntry):LedgerEntry[] {
  if(!Number.isSafeInteger(entry.amount)) throw new Error("סכום התנועה חייב להיות מספר שלם באגורות");
  if(existing.some(e=>e.idempotencyKey===entry.idempotencyKey)) throw new Error("התנועה כבר נרשמה");
  if(entry.kind==="expense"&&entry.amount>=0) throw new Error("הוצאה חייבת להיות תנועה שלילית");
  if(entry.kind==="donation_completed"&&entry.amount>=0) throw new Error("ביצוע תרומה חייב לאפס את הקופה בתנועה שלילית");
  if(entry.kind==="savings_goal_redeemed"&&entry.amount>=0) throw new Error("מימוש יעד חייב להיות תנועה שלילית");
  return [...existing,Object.freeze({...entry})];
}
