import {useMemo,useState} from "react";

type PictureWord={picture:string;word:string};
const wordBank:PictureWord[]=[
 {picture:"🍎",word:"תפוח"},{picture:"🍉",word:"אבטיח"},{picture:"🦁",word:"אריה"},
 {picture:"🏠",word:"בית"},{picture:"🎈",word:"בלון"},{picture:"🍌",word:"בננה"},
 {picture:"🐪",word:"גמל"},{picture:"🥕",word:"גזר"},{picture:"🍦",word:"גלידה"},
 {picture:"🐟",word:"דג"},{picture:"🚪",word:"דלת"},{picture:"🐝",word:"דבורה"},
 {picture:"🧸",word:"דוב"},{picture:"🚩",word:"דגל"},{picture:"🪣",word:"דלי"},
 {picture:"🌄",word:"הר"},{picture:"🦛",word:"היפופוטם"},{picture:"🌹",word:"ורד"},
 {picture:"🧇",word:"וופל"},{picture:"🦓",word:"זברה"},{picture:"🫒",word:"זית"},
 {picture:"🐛",word:"זחל"},{picture:"🐱",word:"חתול"},{picture:"🪟",word:"חלון"},
 {picture:"🥛",word:"חלב"},{picture:"🦚",word:"טווס"},{picture:"💍",word:"טבעת"},
 {picture:"🚀",word:"טיל"},{picture:"🌙",word:"ירח"},{picture:"🕊️",word:"יונה"},
 {picture:"🐕",word:"כלב"},{picture:"🎩",word:"כובע"},{picture:"⚽",word:"כדור"},
 {picture:"❤️",word:"לב"},{picture:"🍋",word:"לימון"},{picture:"🍞",word:"לחם"},
 {picture:"👑",word:"מלך"},{picture:"☂️",word:"מטריה"},{picture:"🔑",word:"מפתח"},
 {picture:"🐍",word:"נחש"},{picture:"🕯️",word:"נר"},{picture:"👟",word:"נעל"},
 {picture:"🐴",word:"סוס"},{picture:"⛵",word:"סירה"},{picture:"🧼",word:"סבון"},
 {picture:"🌳",word:"עץ"},{picture:"🍰",word:"עוגה"},{picture:"🐭",word:"עכבר"},
 {picture:"🐘",word:"פיל"},{picture:"🍄",word:"פטריה"},{picture:"🌸",word:"פרח"},
 {picture:"🐢",word:"צב"},{picture:"🐦",word:"ציפור"},{picture:"🍽️",word:"צלחת"},
 {picture:"🐒",word:"קוף"},{picture:"🌈",word:"קשת"},{picture:"🚂",word:"קטר"},
 {picture:"🦵",word:"רגל"},{picture:"🚆",word:"רכבת"},{picture:"👨‍⚕️",word:"רופא"},
 {picture:"☀️",word:"שמש"},{picture:"⌚",word:"שעון"},{picture:"🪑",word:"שולחן"},
 {picture:"🍓",word:"תות"},{picture:"🐓",word:"תרנגול"},{picture:"🎁",word:"מתנה"}
];
const letters=Array.from("אבגדהוזחטיכלמנסעפצקרשת");
type Exercise=PictureWord&{id:number;answer:string;choices:string[]};
function shuffle<T,>(items:T[]):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function newRound():Exercise[]{return shuffle(wordBank).map((item,id)=>{const answer=Array.from(item.word)[0];const wrong=shuffle(letters.filter(letter=>letter!==answer)).slice(0,2);return {...item,id,answer,choices:shuffle([answer,...wrong])};});}

export function AlphabetWorld({childName,onComplete}:{childName:string;onComplete?:(result:{gameId:string;title:string;score:number;total:number})=>void}){
 const [round,setRound]=useState<Exercise[]>(()=>newRound());
 const [index,setIndex]=useState(0);
 const [chosen,setChosen]=useState<string|null>(null);
 const [correctCount,setCorrectCount]=useState(0);
 const [showHint,setShowHint]=useState(false);
 const current=round[index];
 const finished=index>=round.length;
 const progress=finished?100:Math.round(index/round.length*100);
 const encouragement=useMemo(()=>["איזה יופי! כל הכבוד! 🌟","נכון מאוד! את/ה אלוף/ה! 🎉","מצאת את האות! הידד! 💛","וואו, הצלחה נהדרת! 🥳"],[]);
 function choose(letter:string){if(chosen||!current)return;setChosen(letter);if(letter===current.answer)setCorrectCount(value=>value+1);}
 function next(){if(index===round.length-1)onComplete?.({gameId:"letters",title:"משחק האותיות",score:correctCount,total:round.length});setIndex(value=>value+1);setChosen(null);setShowHint(false);}
 function restart(){setRound(newRound());setIndex(0);setChosen(null);setCorrectCount(0);setShowHint(false);}
 return <section className="alphabet-world" dir="rtl" aria-label="משחק האות הראשונה">
  <div className="alphabet-topline"><div><span className="alphabet-kicker">🌈 משחק לקטנטנים</span><h2>איזו אות מתחבאת בתמונה?</h2><p>מסתכלים על התמונה ובוחרים את האות הראשונה של המילה.</p></div><span className="alphabet-mascot">🦊</span></div>
  {!finished?<><div className="alphabet-progress-row"><span>תרגיל {index+1} מתוך {round.length}</span><b>{correctCount} הצלחות ⭐</b></div><div className="alphabet-progress"><span style={{width:progress+"%"}}/></div>
   <div className="alphabet-picture-card"><span className="alphabet-picture" role="img" aria-label={chosen?current.word:"תמונה לזיהוי"}>{current.picture}</span>{chosen?<><strong className="alphabet-reveal-word">{current.word}</strong><span className="alphabet-feedback" role="status">{chosen===current.answer?encouragement[(index+correctCount)%encouragement.length]:"כמעט! האות הראשונה היא "+current.answer+" 💫"}</span></>:<><strong>איזו אות שומעים בהתחלה?</strong><span className="alphabet-picture-subtitle">בחרו את האות הראשונה של מה שרואים</span></>}</div>
   <div className="alphabet-choices" aria-label="בחירת אות">{current.choices.map((letter,i)=><button type="button" key={letter} disabled={Boolean(chosen)} className={"alphabet-choice"+(chosen&&letter===current.answer?" correct":"")+(chosen===letter&&letter!==current.answer?" incorrect":"")} onClick={()=>choose(letter)} aria-label={"האות "+letter}>{letter}</button>)}</div>
   {!chosen?<button type="button" className="alphabet-hint" onClick={()=>setShowHint(value=>!value)}>{showHint?"✨ חפשו את הצליל הראשון במילה":"💡 רמז קטן"}</button>:<button type="button" className="alphabet-next" onClick={next}>{index===round.length-1?"לסיום המשחק 🏆":"לתרגיל הבא ←"}</button>}
   {chosen&&chosen!==current.answer&&<p className="alphabet-gentle-note">לא נורא, לומדים מכל ניסיון. בפעם הבאה נצליח! 💚</p>}
  </>:<div className="alphabet-finish"><span>🏆🎈🌟</span><h3>איזו אליפות, {childName}!</h3><strong>{correctCount} תשובות נכונות מתוך {round.length}</strong><p>תרגלנו המון אותיות. רוצים לצאת לסיבוב חדש עם תמונות אחרות?</p><button type="button" className="alphabet-next" onClick={restart}>מתחילים סיבוב חדש 🔄</button></div>}
 </section>;
}
