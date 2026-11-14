import {useEffect,useMemo,useState} from "react";

type AgeBand="young"|"middle"|"older";
type Operation="add"|"subtract"|"multiply"|"divide";
type Question={a:number;b:number;answer:number;operation:Operation;choices:number[]};
type OperationStats={attempts:number;correct:number};
type Progress={xp:number;correct:number;streak:number;lastDay:string|null;operationStats:Record<Operation,OperationStats>;coverageBonusClaimed:boolean};
const emptyOperationStats=():Record<Operation,OperationStats>=>({add:{attempts:0,correct:0},subtract:{attempts:0,correct:0},multiply:{attempts:0,correct:0},divide:{attempts:0,correct:0}});
const operations:{id:Operation;label:string;symbol:string;icon:string;hint:string}[]=[
 {id:"add",label:"חיבור",symbol:"+",icon:"➕",hint:"אפשר לספור קדימה מהמספר הגדול."},
 {id:"subtract",label:"חיסור",symbol:"−",icon:"➖",hint:"התחילו מהמספר הראשון וספרו אחורה."},
 {id:"multiply",label:"כפל",symbol:"×",icon:"✖️",hint:"כפל הוא חיבור של אותה כמות כמה פעמים."},
 {id:"divide",label:"חילוק",symbol:"÷",icon:"➗",hint:"חילוק שואל כמה פעמים המספר נכנס במספר השני."}
];
const dayKey=()=>new Date().toLocaleDateString("en-CA");
function makeQuestion(ageBand:AgeBand,operation:Operation):Question{
 const range=ageBand==="young"?10:ageBand==="middle"?20:50;
 let a=0,b=0,answer=0;
 if(operation==="add"){a=randomInt(ageBand==="young"?0:5,range);b=randomInt(0,range);answer=a+b;}
 if(operation==="subtract"){a=randomInt(ageBand==="young"?1:10,range*2);b=randomInt(0,a);answer=a-b;}
 if(operation==="multiply"){const max=ageBand==="young"?5:ageBand==="middle"?10:12;a=randomInt(1,max);b=randomInt(1,max);answer=a*b;}
 if(operation==="divide"){b=randomInt(1,ageBand==="young"?5:12);answer=randomInt(1,ageBand==="older"?12:10);a=b*answer;}
 const options=new Set<number>([answer]);
 while(options.size<4){const offset=randomInt(1,Math.max(4,ageBand==="young"?5:12));options.add(Math.max(0,answer+(Math.random()>.5?offset:-offset)));}
 return {a,b,answer,operation,choices:[...options].sort(()=>Math.random()-.5)};
}
function randomInt(min:number,max:number){return Math.floor(Math.random()*(max-min+1))+min;}
function readProgress(key:string):Progress{
 try{const value=localStorage.getItem(key);if(value){const parsed=JSON.parse(value) as Partial<Progress>;const saved=parsed.operationStats as Partial<Record<Operation,Partial<OperationStats>>>|undefined;const operationStats=emptyOperationStats();for(const item of operations){const stat=saved?.[item.id];operationStats[item.id]={attempts:Math.max(0,Number(stat?.attempts)||0),correct:Math.max(0,Number(stat?.correct)||0)};}return {...parsed,xp:Number(parsed.xp)||0,correct:Number(parsed.correct)||0,streak:Number(parsed.streak)||0,lastDay:typeof parsed.lastDay==="string"?parsed.lastDay:null,operationStats,coverageBonusClaimed:parsed.coverageBonusClaimed===true};}}catch{}
 return {xp:0,correct:0,streak:0,lastDay:null,operationStats:emptyOperationStats(),coverageBonusClaimed:false};
}

export function ArithmeticWorld({childId,ageBand,onComplete}:{childId:string;ageBand:AgeBand;onComplete?:(result:{gameId:string;title:string;score:number;total:number})=>void}){
 const storageKey="mypocket-learning-v1-"+childId;
 const [progress,setProgress]=useState<Progress>(()=>readProgress(storageKey));
 const [operation,setOperation]=useState<Operation>("add");
 const [question,setQuestion]=useState<Question>(()=>makeQuestion(ageBand,"add"));
 const [selected,setSelected]=useState<number|null>(null);
 const [answered,setAnswered]=useState(false);
 const [roundCorrect,setRoundCorrect]=useState(0);
 const [roundCount,setRoundCount]=useState(0);
 const [showHint,setShowHint]=useState(false);
 const [screen,setScreen]=useState<"choose"|"play"|"done">("choose");
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{}},[progress,storageKey]);
 const currentOperation=operations.find(item=>item.id===operation)!;
 const questionText=useMemo(()=>question.a+" "+(question.operation==="add"?"+":question.operation==="subtract"?"−":question.operation==="multiply"?"×":"÷")+" "+question.b+" = ?",[question]);
 function startOperation(next:Operation){
  setOperation(next);setQuestion(makeQuestion(ageBand,next));setSelected(null);setAnswered(false);setShowHint(false);setRoundCorrect(0);setRoundCount(0);setScreen("play");
 }
 function choose(value:number){
  if(answered)return;
  setSelected(value);setAnswered(true);setRoundCount(count=>count+1);
  const isCorrect=value===question.answer;
  if(isCorrect)setRoundCorrect(count=>count+1);
  setProgress(old=>{
   const previous=old.operationStats[question.operation];
   const operationStats={...old.operationStats,[question.operation]:{attempts:previous.attempts+1,correct:previous.correct+(isCorrect?1:0)}};
   if(!isCorrect)return {...old,operationStats};
   const today=dayKey();
   const yesterday=new Date(Date.now()-86400000).toLocaleDateString("en-CA");
   const streak=old.lastDay===today?old.streak:old.lastDay===yesterday?old.streak+1:1;
   const points=previous.correct<5?10:2;
   const allCovered=operations.every(item=>operationStats[item.id].correct>0);
   const coverageBonus=!old.coverageBonusClaimed&&allCovered?20:0;
   return {...old,xp:old.xp+points+coverageBonus,correct:old.correct+1,streak,lastDay:today,operationStats,coverageBonusClaimed:old.coverageBonusClaimed||allCovered};
  });
 }
 function nextQuestion(){
  if(roundCount>=5){onComplete?.({gameId:"arithmetic",title:currentOperation.label,score:roundCorrect,total:5});setScreen("done");return;}
  setQuestion(makeQuestion(ageBand,operation));setSelected(null);setAnswered(false);setShowHint(false);
 }
 function anotherRound(){setRoundCorrect(0);setRoundCount(0);setQuestion(makeQuestion(ageBand,operation));setSelected(null);setAnswered(false);setShowHint(false);setScreen("play");}
 return <section className="learning-world arithmetic-world" aria-label="תרגול חשבון">
  {screen==="choose"&&<>
   <header className="arithmetic-welcome"><span aria-hidden="true">🦊</span><div><h3>בואו נשחק בחשבון!</h3><p>בוחרים משחק קטן ויוצאים לדרך</p></div><small>⭐ {progress.xp}</small></header>
   <div className="arithmetic-pick"><h4>איזה תרגול בא לך?</h4><div className="arithmetic-operation-grid">{operations.map(item=><button type="button" key={item.id} className="arithmetic-operation" onClick={()=>startOperation(item.id)}><span>{item.icon}</span><b>{item.label}</b><i>{item.symbol}</i></button>)}</div></div>
  </>}
  {screen==="play"&&<>
   <div className="arithmetic-play-top"><button type="button" onClick={()=>setScreen("choose")}>← בחירת משחק</button><span>⭐ {progress.xp} נקודות</span></div>
   <div className="arithmetic-round-track" aria-label={`שאלה ${roundCount+1} מתוך 5`}>{[0,1,2,3,4].map(n=><i key={n} className={n<roundCount?"filled":""}/>)}</div>
   <div className="arithmetic-question-card">
    <div className="arithmetic-operation-label">{currentOperation.icon} {currentOperation.label}</div>
    <p className="arithmetic-question">{questionText}</p>
    <div className="arithmetic-answer-grid">{question.choices.map(choice=><button type="button" key={choice} disabled={answered} className={answered&&choice===question.answer?"correct":answered&&choice===selected?"incorrect":""} onClick={()=>choose(choice)}>{choice}</button>)}</div>
    {answered&&<div className={selected===question.answer?"arithmetic-feedback good":"arithmetic-feedback try-again"} role="status"><b>{selected===question.answer?"🎉 כל הכבוד!":"כמעט! ממשיכים ללמוד."}</b>{selected!==question.answer&&<span>התשובה הנכונה היא {question.answer}</span>}<button type="button" className="primary-button" onClick={nextQuestion}>{roundCount>=5?"לסיכום הסיבוב":"לשאלה הבאה ←"}</button></div>}
    {!answered&&<button type="button" className="arithmetic-hint" onClick={()=>setShowHint(value=>!value)}>{showHint?"הסתרת הרמז":"💡 רמז קטן"}</button>}
    {showHint&&!answered&&<p className="arithmetic-hint-text">{currentOperation.hint}</p>}
   </div>
   <p className="arithmetic-encouragement">שאלה {Math.min(roundCount+1,5)} מתוך 5 · כל הכבוד על המאמץ!</p>
  </>}
  {screen==="done"&&<div className="arithmetic-finish"><span>🏆</span><h3>איזה יופי, סיימת סיבוב!</h3><strong>{roundCorrect} מתוך 5 תשובות נכונות</strong><p>כל תרגול הופך אותך למיומן יותר.</p><button type="button" className="primary-button" onClick={anotherRound}>עוד סיבוב</button><button type="button" className="arithmetic-secondary" onClick={()=>setScreen("choose")}>בחירת משחק אחר</button></div>}
 </section>;
}
