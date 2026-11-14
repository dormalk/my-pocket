import {useEffect,useMemo,useState} from "react";

type AgeBand="young"|"middle"|"older";
type Operation="add"|"subtract"|"multiply"|"divide";
type Question={a:number;b:number;answer:number;operation:Operation;choices:number[]};
type OperationStats={attempts:number;correct:number};
type Progress={xp:number;correct:number;streak:number;lastDay:string|null;operationStats:Record<Operation,OperationStats>;coverageBonusClaimed:boolean};
const emptyOperationStats=():Record<Operation,OperationStats>=>({add:{attempts:0,correct:0},subtract:{attempts:0,correct:0},multiply:{attempts:0,correct:0},divide:{attempts:0,correct:0}});

const operations:{id:Operation;label:string;symbol:string;icon:string}[]=[
 {id:"add",label:"חיבור",symbol:"+",icon:"➕"},
 {id:"subtract",label:"חיסור",symbol:"−",icon:"➖"},
 {id:"multiply",label:"כפל",symbol:"×",icon:"✖️"},
 {id:"divide",label:"חילוק",symbol:"÷",icon:"➗"}
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

export function ArithmeticWorld({childId,ageBand}:{childId:string;ageBand:AgeBand}){
 const storageKey="mypocket-learning-v1-"+childId;
 const [progress,setProgress]=useState<Progress>(()=>readProgress(storageKey));
 const [operation,setOperation]=useState<Operation>("add");
 const [question,setQuestion]=useState<Question>(()=>makeQuestion(ageBand,"add"));
 const [selected,setSelected]=useState<number|null>(null);
 const [answered,setAnswered]=useState(false);
 const [roundCorrect,setRoundCorrect]=useState(0);
 const [roundCount,setRoundCount]=useState(0);
 const [showHint,setShowHint]=useState(false);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{}},[progress,storageKey]);
 const level=Math.floor(progress.xp/100)+1;
 const levelName=level<3?"חוקר מספרים":level<6?"אלוף החשבון":"מאסטר מספרים";
 const nextLevel=100-(progress.xp%100);
 const greeting=ageBand==="young"?"בואו נשחק עם מספרים קטנים ונגלה כמה אנחנו חכמים!":ageBand==="older"?"אתגרי חשבון קצרים שיעזרו לך לחדד את החשיבה.":"כל תשובה מקרבת אותך לשלב הבא. מוכנים?";
 const questionText=useMemo(()=>question.operation==="add"?"כמה זה "+question.a+" ועוד "+question.b+"?":question.operation==="subtract"?"כמה זה "+question.a+" פחות "+question.b+"?":question.operation==="multiply"?"כמה זה "+question.a+" כפול "+question.b+"?":"כמה זה "+question.a+" לחלק ל־"+question.b+"?",[question]);
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
 function nextQuestion(){setQuestion(makeQuestion(ageBand,operation));setSelected(null);setAnswered(false);setShowHint(false);}
 function changeOperation(next:Operation){setOperation(next);setQuestion(makeQuestion(ageBand,next));setSelected(null);setAnswered(false);setShowHint(false);setRoundCorrect(0);setRoundCount(0);}
 return <section className="learning-world" aria-label="עולם הלמידה - חשבון">
  <div className="learning-hero"><div><span className="learning-kicker">🦊 השועל החכם מזמין אותך</span><h3>מסע הקסם של המספרים</h3><p>{greeting}</p></div><span className="learning-mascot" aria-hidden="true">🧙🏻‍♂️</span></div>
  <div className="learning-progress"><div className="learning-level"><span>⭐ שלב {level} · {levelName}</span><b>{progress.xp} נק׳ ניסיון</b></div><div className="learning-track"><span style={{width:(progress.xp%100)+"%"}}/></div><small>עוד {nextLevel} נקודות לשלב הבא · מתרגלים את כל ארבעת הסימנים</small><div className="learning-stats"><span>🔥 רצף יומי: <b>{progress.streak}</b></span><span>🎯 תשובות נכונות: <b>{progress.correct}</b></span></div></div>
  <div className="learning-games-heading"><div><b>בחרו אתגר</b><small>אפשר להתאמן בכל נושא כמה שרוצים</small></div><span>📚 חשבון</span></div>
  <div className="learning-operation-grid">{operations.map(item=><button type="button" key={item.id} className={operation===item.id?"learning-operation active":"learning-operation"} aria-pressed={operation===item.id} onClick={()=>changeOperation(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</div>
  <div className="learning-operation-stats" aria-label="התקדמות לפי סימן">{operations.map(item=><div className="learning-operation-stat" key={item.id}><b>{item.symbol} {item.label}</b><span>{progress.operationStats[item.id].correct} נכונות</span><small>{progress.operationStats[item.id].attempts} ניסיונות</small></div>)}</div>
  <div className="math-challenge"><div className="math-challenge-top"><span>⚡ אתגר מהיר</span><small>10 נק׳ לחמש הראשונות בכל סימן, ואז 2 נק׳</small></div><p className="math-question">{questionText}</p><div className="math-answers">{question.choices.map(choice=><button type="button" key={choice} disabled={answered} className={answered&&choice===question.answer?"correct":answered&&choice===selected?"incorrect":""} onClick={()=>choose(choice)}>{choice}</button>)}</div>
   {answered&&<div className={selected===question.answer?"math-feedback success":"math-feedback retry"} role="status">{selected===question.answer?"🎉 כל הכבוד! נקודות הניסיון נוספו לחשבון.":"כמעט! התשובה הנכונה היא "+question.answer+". בפעם הבאה נצליח."}<button type="button" className="primary-button" onClick={nextQuestion}>לשאלה הבאה ←</button></div>}
   {!answered&&<button type="button" className="math-hint-button" onClick={()=>setShowHint(value=>!value)}>{showHint?"הסתרת רמז":"💡 רמז קטן"}</button>}
   {showHint&&!answered&&<p className="math-hint">{operation==="add"?"אפשר לספור קדימה מהמספר הגדול.":operation==="subtract"?"התחילו מהמספר הראשון וספרו אחורה.":operation==="multiply"?"כפל הוא חיבור של אותה כמות כמה פעמים.":"חילוק שואל כמה פעמים המספר נכנס במספר השני."}</p>}
  </div>
  <div className="learning-round"><span>הסיבוב הנוכחי</span><b>{roundCorrect} מתוך {roundCount} תשובות נכונות</b><small>הכוכבים נשמרים במכשיר הזה וחוזרים איתך בפעם הבאה.</small></div>
 </section>;
}
