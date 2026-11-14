import {useMemo,useState} from "react";

type AgeBand="young"|"middle"|"older";
type Choice={label:string;correct:boolean};
type Question={prompt:string;choices:Choice[];explanation:string};
type Scene={title:string;text:{young:string;middle:string;older:string};art:string;caption:string};
type Story={id:string;title:string;subtitle:string;icon:string;readingTime:string;scenes:Scene[];questions:Question[]};

const stories:Story[]=[
 {id:"tortoise-hare",title:"הצב והארנב",subtitle:"סיפור על התמדה, סבלנות ולא לוותר",icon:"🐢",readingTime:"3 דקות",scenes:[
  {title:"האתגר הגדול",text:{young:"ביער גר ארנב מהיר מאוד. הוא תמיד התגאה במהירות שלו וצחק על הצב שהלך לאט.",middle:"ביער חי ארנב מהיר שאהב להתפאר בריצתו. בכל פעם שפגש את הצב, לעג לו על צעדיו האיטיים.",older:"הארנב נודע בכל היער במהירותו, אך גם בגאוותו. הוא נהג ללעוג לצב השקט, שהתקדם תמיד בקצב שלו."},art:"🐰🌳🐢",caption:"הארנב והצב נפגשים בשביל היער"},
  {title:"מתחילים במרוץ",text:{young:"יום אחד הצב הציע מרוץ. הארנב צחק, אבל הסכים. השועל נתן סימן, ושניהם יצאו לדרך.",middle:"הצב הציע לערוך תחרות ריצה. הארנב הסכים בביטחון. השועל סימן להתחיל, והמתחרים יצאו לדרך.",older:"כדי להוכיח שגם התמדה חשובה, הצב הציע מרוץ. הארנב הסכים מיד, משוכנע בניצחונו. השועל שימש כשופט והזניק את התחרות."},art:"🦊🏁🐰🐢",caption:"השועל מזניק את המרוץ"},
  {title:"הפתעה בדרך",text:{young:"הארנב רץ מהר כל כך, שהוא התרחק מאוד. הוא ראה צל נעים והחליט לנוח. בינתיים הצב המשיך ללכת בלי לעצור.",middle:"הארנב פתח פער גדול והחליט לנמנם מתחת לעץ. הצב לא עצר לרגע והמשיך להתקדם לאט ובטוח.",older:"כשראה שהצב רחוק מאחור, הארנב היה בטוח שיש לו זמן. הוא נשכב בצל העץ ונרדם, בעוד הצב המשיך בצעדיו הקבועים."},art:"🌳😴🐰  🐢💨",caption:"הארנב נח, והצב ממשיך בדרך"},
  {title:"קו הסיום",text:{young:"הצב הגיע לקו הסיום ראשון! הארנב התעורר מאוחר מדי. כולם מחאו כפיים לצב שהתמיד ולא ויתר.",middle:"כשהארנב התעורר, הצב כבר היה קרוב לסיום. הוא רץ בכל כוחו, אך הצב חצה את הקו ראשון וזכה במרוץ.",older:"הארנב התעורר וגילה שהצב עומד לנצח. הוא זינק קדימה, אך איחר: הצב חצה את קו הסיום וזכה בזכות התמדה וסבלנות."},art:"🏆🐢🎉🐰",caption:"הצב מנצח בזכות ההתמדה"}
 ],questions:[
  {prompt:"מי הציע לערוך מרוץ?",choices:[{label:"הצב",correct:true},{label:"הארנב",correct:false},{label:"השועל",correct:false}],explanation:"הצב הוא שהציע את המרוץ כדי להראות שגם התמדה חשובה."},
  {prompt:"למה הארנב עצר בדרך?",choices:[{label:"הוא רצה לנמנם בצל העץ",correct:true},{label:"הוא חיפש אוכל",correct:false},{label:"הוא חיכה לשועל",correct:false}],explanation:"הארנב היה בטוח שיש לו מספיק זמן ולכן נרדם."},
  {prompt:"מה עזר לצב לנצח?",choices:[{label:"הוא המשיך להתקדם ולא ויתר",correct:true},{label:"הוא רץ מהר יותר מהארנב",correct:false},{label:"השועל נשא אותו",correct:false}],explanation:"הצב התקדם בעקביות עד לקו הסיום."}
 ]},
 {id:"lion-mouse",title:"האריה והעכבר",subtitle:"סיפור על חברות ועזרה הדדית",icon:"🦁",readingTime:"3 דקות",scenes:[
  {title:"מפגש ביער",text:{young:"אריה גדול ישן ביער. עכבר קטן רץ לידו בטעות והעיר אותו. האריה תפס את העכבר בכף שלו.",middle:"באחד הימים ישן אריה בצל עץ. עכבר קטן התרוצץ על גבו והעיר אותו. האריה תפס אותו בכפו.",older:"אריה אדיר נח בצל עץ לאחר ארוחה. עכבר קטן מיהר בדרכו, טיפס עליו בלי לשים לב והעיר אותו משנתו."},art:"🦁💤🐭",caption:"העכבר הקטן מעיר את האריה"},
  {title:"הבטחה קטנה",text:{young:"העכבר ביקש סליחה והבטיח לעזור לאריה יום אחד. האריה צחק, אבל שחרר אותו.",middle:"העכבר התחנן שישחרר אותו והבטיח שיחזיר לו טובה בעתיד. האריה צחק מהרעיון, אך החליט לשחררו.",older:"העכבר התחנן לחירות והבטיח שיום אחד יוכל לגמול לאריה על טוב ליבו. האריה השתעשע מההבטחה, אך שחרר אותו."},art:"🐭🙏🦁",caption:"העכבר מבקש הזדמנות להחזיר טובה"},
  {title:"האריה בצרה",text:{young:"כעבור כמה ימים האריה נתפס ברשת של ציידים. הוא שאג וניסה להשתחרר, אבל הרשת הייתה חזקה.",middle:"ימים אחדים לאחר מכן נלכד האריה ברשת ציידים. הוא נאבק בחבלים ושאג בקול, אך לא הצליח להשתחרר.",older:"לאחר כמה ימים נלכד האריה ברשת חזקה שהציבו ציידים. ככל שנאבק יותר, כך הסתבכו החבלים סביבו."},art:"🦁🕸️🌲",caption:"האריה מגלה שהוא לכוד ברשת"},
  {title:"חבר קטן, עזרה גדולה",text:{young:"העכבר שמע את השאגה, רץ אל האריה וכרסם את החבלים בשיניו. האריה השתחרר והודה לו.",middle:"העכבר שמע את שאגות האריה ומיהר לעזור. הוא כרסם את החבלים עד שנוצר פתח והאריה השתחרר.",older:"העכבר זיהה את קולו של האריה, רץ אליו וכרסם בסבלנות את חבלי הרשת. לבסוף האריה השתחרר והבין שגם יצור קטן יכול לעזור מאוד."},art:"🐭🦷🕸️🦁✨",caption:"העכבר מציל את חברו הגדול"}
 ],questions:[
  {prompt:"מה קרה כשהעכבר פגש את האריה בפעם הראשונה?",choices:[{label:"הוא העיר אותו בטעות",correct:true},{label:"הוא נתן לו מתנה",correct:false},{label:"הם יצאו למרוץ",correct:false}],explanation:"העכבר התרוצץ ליד האריה והעיר אותו משנתו."},
  {prompt:"איך העכבר עזר לאריה?",choices:[{label:"כרסם את חבלי הרשת",correct:true},{label:"קרא לציידים",correct:false},{label:"משך את האריה בזנב",correct:false}],explanation:"בשיניו הקטנות כרסם העכבר את החבלים עד שהאריה השתחרר."},
  {prompt:"מהו המסר המרכזי של הסיפור?",choices:[{label:"גם קטן יכול לעזור לגדול",correct:true},{label:"אסור לישון ביער",correct:false},{label:"רק חזקים יכולים לעזור",correct:false}],explanation:"הסיפור מלמד שלכל אחד יש יכולת לעזור, בלי קשר לגודלו."}
 ]},
 {id:"red-riding-hood",title:"כיפה אדומה",subtitle:"סיפור על זהירות והקשבה",icon:"🧺",readingTime:"4 דקות",scenes:[
  {title:"בדרך לסבתא",text:{young:"כיפה אדומה יצאה לבקר את סבתא שלה. בסל שלה היו עוגה ופירות. אמא ביקשה ממנה ללכת ישר לבית של סבתא.",middle:"בוקר אחד יצאה כיפה אדומה אל בית סבתה, ובסל נשאה עוגה ופירות. אמה ביקשה ממנה להישאר בשביל ולא להתעכב.",older:"כיפה אדומה יצאה דרך היער כדי להביא לסבתה החולה סל עם מאפים ופירות. לפני שיצאה, אמה הזכירה לה להיצמד לשביל ולהיזהר מזרים."},art:"👧🏻🧺🌲🏡",caption:"כיפה אדומה יוצאת לבקר את סבתא"},
  {title:"הזאב בדרך",text:{young:"ביער פגשה כיפה אדומה זאב. הוא שאל לאן היא הולכת. היא סיפרה לו שהיא בדרך לבית של סבתא.",middle:"בין העצים הופיע זאב ושאל את כיפה אדומה לאן פניה. היא סיפרה לו שהיא מביאה אוכל לסבתה שבקצה היער.",older:"זאב ערמומי ניגש אל כיפה אדומה ושאל בנימוס לאן היא הולכת. היא סיפרה לו על בית סבתה ועל הסל שבידה."},art:"🐺🌳👧🏻",caption:"הזאב פוגש את כיפה אדומה"},
  {title:"תוכנית הזאב",text:{young:"הזאב הציע לה לקטוף פרחים. בזמן שכיפה אדומה חיפשה פרחים, הוא רץ לבית של סבתא והגיע ראשון.",middle:"הזאב הסיח את דעתה והציע שתאסוף פרחים לסבתה. בזמן שהתעכבה, הוא מיהר אל בית הסבתא והקדים אותה.",older:"הזאב שכנע אותה לסטות מהשביל כדי לקטוף פרחים. בזמן שאספה זר יפה, הוא רץ בדרך הקצרה אל בית הסבתא."},art:"🐺💨🏡🌷",caption:"הזאב מקדים להגיע לבית הסבתא"},
  {title:"העזרה מגיעה",text:{young:"כיפה אדומה הגיעה לבית ושמה לב שמשהו מוזר. היא קראה לעזרה. צייד שעבר ליד הבית נכנס, והזאב ברח. כיפה אדומה למדה להיזהר.",middle:"כיפה אדומה הבחינה שמשהו אינו כשורה וקראה לעזרה. צייד ששמע אותה נכנס לבית, והזאב נמלט. היא הבינה שחשוב להקשיב לאמא ולהיזהר מזרים.",older:"כשהגיעה לבית, כיפה אדומה הבחינה שהדמות במיטה אינה נראית כמו סבתה. היא הזעיקה עזרה; צייד שעבר בסביבה נכנס והבריח את הזאב. כיפה אדומה למדה לא לסטות מההנחיות שקיבלה."},art:"👧🏻🗣️🪓🏡✨",caption:"כיפה אדומה מזעיקה עזרה"}
 ],questions:[
  {prompt:"מה היה בסל של כיפה אדומה?",choices:[{label:"עוגה ופירות",correct:true},{label:"צעצועים וספרים",correct:false},{label:"פרחים ואבנים",correct:false}],explanation:"היא נשאה סל עם עוגה ופירות עבור סבתה."},
  {prompt:"איך הזאב הצליח להגיע לבית הסבתא לפניה?",choices:[{label:"הוא הסיח את דעתה עם פרחים",correct:true},{label:"הוא התחבא בסל",correct:false},{label:"הוא ביקש ממנה לרוץ",correct:false}],explanation:"הזאב שלח אותה לקטוף פרחים בזמן שהוא מיהר לבית."},
  {prompt:"מה למדה כיפה אדומה?",choices:[{label:"להישאר בשביל ולהיזהר מזרים",correct:true},{label:"לא לבקר את סבתא",correct:false},{label:"לקטוף כמה שיותר פרחים",correct:false}],explanation:"היא למדה להקשיב להנחיות ולהיזהר כשפוגשים זרים."}
 ]}
];

type LearningProgress={xp:number;correct:number;streak:number;lastDay:string|null};
const progressKey=(id:string)=>"mypocket-learning-v1-"+id;
const completedKey=(id:string)=>"mypocket-reading-completed-v1-"+id;
function readCompleted(id:string):string[]{try{const value=JSON.parse(localStorage.getItem(completedKey(id))??"[]");return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];}catch{return[];}}
function ageText(scene:Scene,ageBand:AgeBand){return scene.text[ageBand];}
function Illustration({scene}:{scene:Scene}){return <div className="reading-illustration" role="img" aria-label={scene.caption}><div className="reading-art-spark spark-a">✦</div><div className="reading-art-spark spark-b">✧</div><span>{scene.art}</span><small>{scene.caption}</small></div>;}

export function ReadingWorld({childId,ageBand}:{childId:string;ageBand:AgeBand}){
 const [storyId,setStoryId]=useState<string|null>(null);
 const [sceneIndex,setSceneIndex]=useState(0);
 const [questionIndex,setQuestionIndex]=useState(0);
 const [selected,setSelected]=useState<number|null>(null);
 const [answers,setAnswers]=useState<boolean[]>([]);
 const [completed,setCompleted]=useState<string[]>(()=>readCompleted(childId));
 const [earned,setEarned]=useState(0);
 const [alreadyCompleted,setAlreadyCompleted]=useState(false);
 const story=stories.find(item=>item.id===storyId)??null;
 const scene=story?.scenes[sceneIndex]??null;
 const question=story?.questions[questionIndex]??null;
 const storyAlreadyCompleted=alreadyCompleted;
 const learningProgress=useMemo(()=>{try{const saved=JSON.parse(localStorage.getItem(progressKey(childId))??"{}") as Partial<LearningProgress>;return {xp:Number(saved.xp)||0,correct:Number(saved.correct)||0};}catch{return {xp:0,correct:0};}},[childId,completed,earned]);
 const level=Math.floor(learningProgress.xp/100)+1;
 function startStory(id:string){setStoryId(id);setAlreadyCompleted(completed.includes(id));setSceneIndex(0);setQuestionIndex(0);setSelected(null);setAnswers([]);setEarned(0);}
 function answer(index:number){if(selected!==null||!question)return;setSelected(index);setAnswers(old=>[...old,question.choices[index]?.correct===true]);}
 function nextQuestion(){if(!story)return;if(questionIndex+1<story.questions.length){setQuestionIndex(value=>value+1);setSelected(null);return;}
  const all=[...answers];const correct=all.filter(Boolean).length;const xp=correct*10+10;
  let progress:LearningProgress={xp:0,correct:0,streak:0,lastDay:null};
  try{progress={...progress,...JSON.parse(localStorage.getItem(progressKey(childId))??"{}")};}catch{}
  if(!alreadyCompleted){try{localStorage.setItem(progressKey(childId),JSON.stringify({...progress,xp:progress.xp+xp,correct:progress.correct+correct}));const next=[...completed,story.id];localStorage.setItem(completedKey(childId),JSON.stringify(next));setCompleted(next);}catch{}setEarned(xp);}
  setQuestionIndex(story.questions.length);
 }
 function backToLibrary(){setStoryId(null);setSceneIndex(0);setQuestionIndex(0);setSelected(null);setAnswers([]);setEarned(0);setAlreadyCompleted(false);}
 return <section className="learning-world reading-world" aria-label="עולם הקריאה">
  <div className="learning-hero reading-hero"><div><span className="learning-kicker">📖 השועל החכם פותח ספר קסמים</span><h3>מסע בין סיפורים</h3><p>קוראים סיפור, פותרים חידות וצוברים נקודות ניסיון.</p></div><span className="learning-mascot" aria-hidden="true">🦊📚</span></div>
  <div className="learning-progress"><div className="learning-level"><span>⭐ שלב {level}</span><b>{learningProgress.xp} נקודות ניסיון</b></div><div className="learning-track"><span style={{width:(learningProgress.xp%100)+"%"}}/></div><small>כל תשובה נכונה מזכה ב־10 נקודות ניסיון, והשלמת סיפור מעניקה בונוס.</small></div>
  {!story&&<><div className="learning-games-heading"><div><b>בחרו סיפור לקריאה</b><small>סיפורים קלאסיים בעיבוד ידידותי לילדים</small></div><span>📚 {stories.length} סיפורים</span></div><div className="reading-library">{stories.map(item=><button type="button" className="reading-story-card" key={item.id} onClick={()=>startStory(item.id)}><span className="reading-story-art">{item.icon}</span><span className="reading-story-copy"><b>{item.title}</b><small>{item.subtitle}</small><small>⏱ {item.readingTime} · {item.scenes.length} קטעים · {item.questions.length} שאלות</small></span><span className="reading-story-arrow">←</span>{completed.includes(item.id)&&<span className="reading-done">✓ הושלם</span>}</button>)}</div></>}
  {story&&scene&&questionIndex<story.questions.length&&<><div className="reading-topline"><button type="button" className="reading-back" onClick={backToLibrary}>→ לכל הסיפורים</button><span>{story.icon} {story.title}</span></div><div className="reading-progress-line"><span style={{width:((sceneIndex+1)/story.scenes.length*100)+"%"}}/></div><article className="reading-page"><div className="reading-page-heading"><small>קטע {sceneIndex+1} מתוך {story.scenes.length}</small><h4>{scene.title}</h4></div><Illustration scene={scene}/><p className="reading-story-text">{ageText(scene,ageBand)}</p>{sceneIndex+1<story.scenes.length?<button type="button" className="primary-button reading-next" onClick={()=>setSceneIndex(value=>value+1)}>המשך לסיפור ←</button>:<button type="button" className="primary-button reading-next" onClick={()=>{setSceneIndex(story.scenes.length);setQuestionIndex(0);}}>סיימתי לקרוא — לשאלות! ✨</button>}</article>{sceneIndex===story.scenes.length-1&&<div className="reading-quiz-intro">🧠 עכשיו נראה כמה פרטים מהסיפור זכרת!</div>}</>}
  {story&&question&&sceneIndex===story.scenes.length&&<div className="reading-quiz"><div className="reading-topline"><button type="button" className="reading-back" onClick={backToLibrary}>→ לכל הסיפורים</button><span>שאלה {questionIndex+1} מתוך {story.questions.length}</span></div><div className="reading-question-card"><span className="reading-question-icon">🧩</span><h4>{question.prompt}</h4><div className="reading-choices">{question.choices.map((choice,index)=><button type="button" key={choice.label} disabled={selected!==null} className={selected===index?(choice.correct?"correct":"incorrect"):selected!==null&&choice.correct?"correct":""} onClick={()=>answer(index)}>{choice.label}</button>)}</div>{selected!==null&&<div className="reading-feedback" role="status"><b>{question.choices[selected]?.correct?"🎉 תשובה נכונה!":"💡 נלמד גם מהטעות"}</b><p>{question.explanation}</p><button type="button" className="primary-button" onClick={nextQuestion}>{questionIndex+1===story.questions.length?"סיום וקבלת נקודות":"לשאלה הבאה ←"}</button></div>}</div></div>}
  {story&&questionIndex>=story.questions.length&&<div className="reading-result"><span>🏆</span><h4>{storyAlreadyCompleted?"כל הכבוד, קראת שוב!":"סיפור הושלם!"}</h4><p>{storyAlreadyCompleted?"הסיפור הזה כבר הושלם בעבר, ולכן לא נוספו נקודות נוספות.": "ענית על "+answers.length+" שאלות, מתוכן "+answers.filter(Boolean).length+" נכונות."}</p>{!storyAlreadyCompleted&&<strong>+{earned} נקודות ניסיון ⭐</strong>}<button type="button" className="primary-button" onClick={backToLibrary}>חזרה לספריית הסיפורים</button></div>}
  {story&&storyAlreadyCompleted&&questionIndex===0&&<p className="reading-repeat-note">הסיפור הזה כבר הושלם. אפשר לקרוא שוב ולתרגל, אבל נקודות ניסיון נוספות לא יינתנו עליו.</p>}
 </section>;
}
