export type DailyBalance={date:string;closingBalanceAgorot:number};
export type InterestCredit={amountAgorot:number;unroundedAgorot:number;days:number};
function daysInYear(y:number):365|366{return y%4===0&&(y%100!==0||y%400===0)?366:365;}
/** Rate in basis points; accrued fractions are rounded only at monthly credit. */
export function calculateMonthlyInterest(balances:readonly DailyBalance[],annualRateBps:number):InterestCredit {
 if(!Number.isInteger(annualRateBps)||annualRateBps<0||annualRateBps>100000) throw new Error("שיעור ריבית לא תקין");
 let accrued=0;
 for(const day of balances){
  if(!Number.isSafeInteger(day.closingBalanceAgorot)||day.closingBalanceAgorot<0) throw new Error("יתרה יומית לא תקינה");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(day.date)) throw new Error("תאריך לא תקין");
  const parsed=new Date(day.date+"T00:00:00.000Z");
  if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==day.date) throw new Error("תאריך לא תקין");
  accrued+=day.closingBalanceAgorot*annualRateBps/10000/daysInYear(parsed.getUTCFullYear());
 }
 return {amountAgorot:Math.round(accrued),unroundedAgorot:accrued,days:balances.length};
}
