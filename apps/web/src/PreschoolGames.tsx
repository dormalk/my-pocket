import {useEffect,useMemo,useState} from "react";

const countRounds=[
 {picture:"🍎",name:"תפוחים"},{picture:"⭐",name:"כוכבים"},{picture:"🐥",name:"אפרוחים"},{picture:"🍓",name:"תותים"},{picture:"🚗",name:"מכוניות"},
 {picture:"🦋",name:"פרפרים"},{picture:"🎈",name:"בלונים"},{picture:"🐠",name:"דגים"},{picture:"🌼",name:"פרחים"},{picture:"🧸",name:"דובונים"}
];
function shuffle<T,>(items:T[]):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}

export function CountingWorld(){
 const [round,setRound]=useState(()=>shuffle(countRounds));
 const [index,setIndex]=useState(0);
 const [answer,setAnswer]=useState<number|null>(null);
 const [score,setScore]=useState(0);
 const current=round[index];
 const finished=index>=round.length;
 const choices=useMemo(()=>current?shuffle([index+1,...shuffle(Array.from({length:10},(_,i)=>i+1).filter(n=>n!==index+1)).slice(0,2)]):[],[current,index]);
 function choose(value:number){if(answer!==null)return;setAnswer(value);if(value===index+1)setScore(s=>s+1);}
 function next(){setIndex(i=>i+1);setAnswer(null);}
 function restart(){setRound(shuffle(countRounds));setIndex(0);setAnswer(null);setScore(0);}
 return <section className="preschool-game counting-world" dir="rtl" aria-label="סופרים עד עשר">
  <div className="preschool-game-heading"><span>🔟</span><div><small>משחק מספרים</small><h3>סופרים עד 10</h3><p>סופרים את התמונות ובוחרים את המספר הנכון.</p></div></div>
  {!finished?<><div className="preschool-game-progress"><span>תרגיל {index+1} מתוך 10</span><b>{score} הצלחות ⭐</b></div><div className="preschool-game-track"><span style={{width:(index/10*100)+"%"}}/></div>
   <div className="counting-board"><div className="counting-objects" aria-label={index+1+" "+current.name}>{Array.from({length:index+1},(_,i)=><span key={i} aria-hidden="true">{current.picture}</span>)}</div><strong>כמה {current.name} יש כאן?</strong></div>
   <div className="preschool-number-options">{choices.map(n=><button key={n} type="button" disabled={answer!==null} className={answer!==null&&n===index+1?"correct":answer===n?"incorrect":""} onClick={()=>choose(n)}>{n}</button>)}</div>
   {answer!==null&&<div className={"preschool-answer "+(answer===index+1?"good":"gentle")} role="status"><b>{answer===index+1?"כל הכבוד! 🎉":"כמעט! 💛"}</b><span>{answer===index+1?"ספרת נכון!":"יש כאן "+(index+1)+" "+current.name+"."}</span><button type="button" onClick={next}>{index===9?"לסיום 🏆":"ממשיכים ←"}</button></div>}
  </>:<div className="preschool-game-finish"><span>🏆🎈</span><h3>איזה יופי!</h3><strong>{score} מתוך 10 תשובות נכונות</strong><p>ספרנו עד עשר ביחד. רוצים לשחק שוב?</p><button type="button" onClick={restart}>סיבוב חדש 🔄</button></div>}
 </section>;
}

const memoryPictures=["🦊","🐼","🐸","🦁","🐰","🐻"];
type MemoryCard={id:number;picture:string};
function newMemoryRound():MemoryCard[]{return shuffle(memoryPictures.flatMap((picture,i)=>[{id:i*2,picture},{id:i*2+1,picture}]));}
export function MemoryWorld(){
 const [cards,setCards]=useState<MemoryCard[]>(newMemoryRound);
 const [opened,setOpened]=useState<number[]>([]);
 const [matched,setMatched]=useState<number[]>([]);
 const [moves,setMoves]=useState(0);
 const [locked,setLocked]=useState(false);
 const done=matched.length===cards.length;
 useEffect(()=>{if(opened.length!==2)return;const [a,b]=opened;const isMatch=cards[a].picture===cards[b].picture;const timer=window.setTimeout(()=>{if(isMatch)setMatched(old=>[...old,a,b]);setOpened([]);setLocked(false);},isMatch?450:1000);return()=>window.clearTimeout(timer);},[opened,cards]);
 function flip(index:number){if(locked||opened.includes(index)||matched.includes(index)||done)return;const next=[...opened,index];if(next.length===2){setLocked(true);setMoves(m=>m+1);}setOpened(next);}
 function restart(){setCards(newMemoryRound());setOpened([]);setMatched([]);setMoves(0);setLocked(false);}
 return <section className="preschool-game memory-world" dir="rtl" aria-label="משחק זיכרון">
  <div className="preschool-game-heading"><span>🧠</span><div><small>משחק חשיבה</small><h3>משחק הזיכרון</h3><p>הופכים קלפים ומוצאים זוגות של חיות זהות.</p></div></div>
  <div className="memory-stats"><span>זוגות שמצאנו: <b>{matched.length/2} מתוך 6</b></span><span>ניסיונות: <b>{moves}</b></span></div>
  <div className="memory-grid">{cards.map((card,i)=>{const visible=opened.includes(i)||matched.includes(i);return <button type="button" key={card.id} className={"memory-card"+(visible?" revealed":"")+(matched.includes(i)?" matched":"")} onClick={()=>flip(i)} disabled={visible||locked||done} aria-label={visible?card.picture:"קלף הפוך"} aria-pressed={visible}>{visible?<span>{card.picture}</span>:<span>❔</span>}</button>;})}</div>
  {done?<div className="preschool-game-finish memory-finish" role="status"><span>🌟🦊🎉</span><h3>מצאת את כל הזוגות!</h3><strong>כל הכבוד! סיימת ב־{moves} ניסיונות.</strong><p>הזיכרון שלך נהדר!</p><button type="button" onClick={restart}>משחק חדש 🔄</button></div>:<p className="memory-encouragement" aria-live="polite">{matched.length?"יופי! ממשיכים לחפש זוגות 💚":"נסו לזכור איפה כל חיה מתחבאת!"}</p>}
 </section>;
}
