import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient, UserRole } from "@prisma/client";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { allocateIncome, validatePercentages } from "@mypocket/domain";

const envSchema=z.object({
  PORT:z.coerce.number().int().positive().default(4000),
  HOST:z.string().default("0.0.0.0"),
  NODE_ENV:z.enum(["development","test","production"]).default("development"),
  SESSION_COOKIE_NAME:z.string().default("mypocket_session")
});
const env=envSchema.parse(process.env);
const prisma=new PrismaClient();
const app=Fastify({logger:true,trustProxy:false,bodyLimit:64*1024});
const SESSION_DAYS=14;
const cookieOptions={httpOnly:true,secure:env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:SESSION_DAYS*24*60*60};

const registerSchema=z.object({
  familyName:z.string().trim().min(2).max(80),
  parentName:z.string().trim().min(2).max(80),
  email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  password:z.string().min(12).max(128)
});
const loginSchema=z.object({
  email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  password:z.string().min(1).max(128)
});
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");

async function issueSession(userId:string,reply:FastifyReply){
  const token=randomBytes(32).toString("base64url");
  const expiresAt=new Date(Date.now()+SESSION_DAYS*24*60*60*1000);
  await prisma.session.create({data:{userId,tokenHash:tokenHash(token),expiresAt}});
  reply.setCookie(env.SESSION_COOKIE_NAME,token,{...cookieOptions,expires:expiresAt});
}

async function currentUser(request:FastifyRequest){
  const token=request.cookies[env.SESSION_COOKIE_NAME];
  if(!token) return null;
  const session=await prisma.session.findUnique({
    where:{tokenHash:tokenHash(token)},
    include:{user:{select:{id:true,email:true,name:true,role:true,familyId:true,family:{select:{name:true}}}}}
  });
  if(!session) return null;
  if(session.expiresAt.getTime()<=Date.now()){
    await prisma.session.delete({where:{id:session.id}}).catch(()=>undefined);
    return null;
  }
  return session.user;
}

await app.register(cookie);
await app.register(rateLimit,{global:true,max:100,timeWindow:"1 minute"});

app.get("/health",async()=>({status:"ok",service:"my-pocket-api",mode:"virtual-money-only"}));

app.post("/auth/register",{config:{rateLimit:{max:5,timeWindow:"15 minutes"}}},async(request,reply)=>{
  const parsed=registerSchema.safeParse(request.body);
  if(!parsed.success) return reply.code(400).send({error:"invalid_registration",details:parsed.error.flatten().fieldErrors});
  const data=parsed.data;
  const passwordHash=await argon2.hash(data.password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  try{
    const user=await prisma.$transaction(async tx=>{
      const family=await tx.family.create({
        data:{
          name:data.familyName,
          allocation:{create:{expensesBps:5000,savingsBps:3000,donationBps:2000}},
          interest:{create:{annualBps:0}}
        }
      });
      return tx.user.create({data:{familyId:family.id,email:data.email,name:data.parentName,passwordHash,role:UserRole.PARENT},select:{id:true,email:true,name:true,role:true,familyId:true}});
    });
    await issueSession(user.id,reply);
    return reply.code(201).send({user});
  }catch(error){
    if(typeof error==="object"&&error!==null&&"code" in error&&(error as {code?:string}).code==="P2002")
      return reply.code(409).send({error:"account_already_exists"});
    throw error;
  }
});

app.post("/auth/login",{config:{rateLimit:{max:5,timeWindow:"15 minutes"}}},async(request,reply)=>{
  const parsed=loginSchema.safeParse(request.body);
  if(!parsed.success) return reply.code(400).send({error:"invalid_credentials"});
  const user=await prisma.user.findUnique({where:{email:parsed.data.email}});
  if(!user||!(await argon2.verify(user.passwordHash,parsed.data.password)))
    return reply.code(401).send({error:"invalid_email_or_password"});
  await issueSession(user.id,reply);
  return {user:{id:user.id,email:user.email,name:user.name,role:user.role,familyId:user.familyId}};
});

app.get("/auth/me",async(request,reply)=>{
  const user=await currentUser(request);
  if(!user) return reply.code(401).send({error:"not_authenticated"});
  return {user};
});

app.post("/auth/logout",async(request,reply)=>{
  const token=request.cookies[env.SESSION_COOKIE_NAME];
  if(token) await prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}});
  reply.clearCookie(env.SESSION_COOKIE_NAME,{path:"/"});
  return {ok:true};
});


const childSchema=z.object({name:z.string().trim().min(1).max(60),avatar:z.string().trim().min(1).max(16).default("🧒"),birthYear:z.number().int().min(2000).max(new Date().getFullYear()).optional()});
async function requireParent(request:FastifyRequest,reply:FastifyReply){
  const user=await currentUser(request);
  if(!user){await reply.code(401).send({error:"not_authenticated"});return null;}
  if(user.role!==UserRole.PARENT){await reply.code(403).send({error:"parent_access_required"});return null;}
  return user;
}

const publicChildTokenSchema=z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/);
app.get("/public/child/:token",async(request,reply)=>{
  const params=z.object({token:publicChildTokenSchema}).safeParse(request.params);
  reply.header("Cache-Control","no-store, private").header("Referrer-Policy","no-referrer").header("X-Robots-Tag","noindex, nofollow");
  if(!params.success)return reply.code(404).send({error:"share_link_not_found"});
  const link=await prisma.childAccessLink.findFirst({where:{tokenHash:tokenHash(params.data.token),revokedAt:null},include:{child:{select:{id:true,name:true,birthYear:true,avatar:true,archivedAt:true,purses:{select:{id:true,type:true}},goals:{where:{active:true,redeemedAt:null},orderBy:{createdAt:"desc"},take:1,select:{title:true,targetAgorot:true,achievedAt:true}},family:{select:{timezone:true}}}}}});
  if(!link||link.child.archivedAt)return reply.code(404).send({error:"share_link_not_found"});
  const purseIds=link.child.purses.map(p=>p.id);
  const totals=purseIds.length?await prisma.ledgerEntry.groupBy({by:["purseId"],where:{purseId:{in:purseIds}},_sum:{amountAgorot:true}}):[];
  const balances=new Map(totals.map(item=>[item.purseId,item._sum.amountAgorot??0]));
  const {today,weekStart,nextWeek}=localDateRange(link.child.family.timezone);
  const tasks=await prisma.purseTask.findMany({where:{childId:link.child.id,active:true},include:{approvals:{where:{completedOn:{gte:weekStart,lt:nextWeek}},select:{completedOn:true}}}});
  return {child:{id:link.child.id,name:link.child.name,birthYear:link.child.birthYear,avatar:link.child.avatar,purses:link.child.purses.map(p=>({id:p.id,type:p.type,balanceAgorot:balances.get(p.id)??0})),savingsGoal:link.child.goals[0]??null,tasks:tasks.map(task=>({id:task.id,title:task.title,frequency:task.frequency,amountAgorot:task.amountAgorot,weeklyRequiredCount:task.weeklyRequiredCount,approvedCountThisWeek:task.approvals.length,approvedToday:task.approvals.some(a=>a.completedOn.getTime()===today.getTime()),weekStart:weekStart.toISOString().slice(0,10)}))}};
});

app.get("/children",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const children=await prisma.child.findMany({where:{familyId:user.familyId,archivedAt:null},orderBy:{createdAt:"asc"},include:{purses:{select:{id:true,type:true}}}});
  const purseIds=children.flatMap(child=>child.purses.map(purse=>purse.id));
  const totals=purseIds.length?await prisma.ledgerEntry.groupBy({by:["purseId"],where:{purseId:{in:purseIds}},_sum:{amountAgorot:true}}):[];
  const balances=new Map(totals.map(item=>[item.purseId,item._sum.amountAgorot??0]));
  return {children:children.map(child=>({id:child.id,name:child.name,birthYear:child.birthYear,avatar:child.avatar,purses:child.purses.map(purse=>({id:purse.id,type:purse.type,balanceAgorot:balances.get(purse.id)??0}))}))};
});

app.get("/children/:childId/share-link",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
  const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},select:{id:true}});if(!child)return reply.code(404).send({error:"child_not_found"});
  const link=await prisma.childAccessLink.findFirst({where:{childId:child.id,revokedAt:null},select:{id:true}});
  return {active:Boolean(link)};
});
app.post("/children/:childId/share-link",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
  const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},select:{id:true}});if(!child)return reply.code(404).send({error:"child_not_found"});
  const token=randomBytes(32).toString("base64url");
  await prisma.childAccessLink.upsert({where:{childId:child.id},create:{childId:child.id,tokenHash:tokenHash(token)},update:{tokenHash:tokenHash(token),createdAt:new Date(),revokedAt:null}});
  return {path:"/kid/"+token};
});
app.delete("/children/:childId/share-link",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
  const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},select:{id:true}});if(!child)return reply.code(404).send({error:"child_not_found"});
  await prisma.childAccessLink.updateMany({where:{childId:child.id,revokedAt:null},data:{revokedAt:new Date()}});
  return {ok:true};
});

app.delete("/children/:childId",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const params=z.object({childId:z.string().uuid()}).safeParse(request.params);
  if(!params.success)return reply.code(400).send({error:"invalid_child"});
  const result=await prisma.child.updateMany({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},data:{archivedAt:new Date()}});
  if(result.count===0)return reply.code(404).send({error:"child_not_found"});
  return {ok:true};
});
app.post("/children",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const parsed=childSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:"invalid_child",details:parsed.error.flatten().fieldErrors});
  const child=await prisma.$transaction(async tx=>{const familyPolicy=await tx.allocationPolicy.findUnique({where:{familyId:user.familyId}});return tx.child.create({data:{familyId:user.familyId,name:parsed.data.name,birthYear:parsed.data.birthYear,avatar:parsed.data.avatar,purses:{create:[{type:"EXPENSES"},{type:"SAVINGS"},{type:"DONATION"}]},allocation:{create:{expensesBps:familyPolicy?.expensesBps??5000,savingsBps:familyPolicy?.savingsBps??3000,donationBps:familyPolicy?.donationBps??2000}}},include:{purses:{select:{id:true,type:true}}}});});
  return reply.code(201).send({child:{id:child.id,name:child.name,birthYear:child.birthYear,avatar:child.avatar,purses:child.purses.map(purse=>({...purse,balanceAgorot:0}))}});
});


const allocationSchema=z.object({expensesBps:z.number().int().min(0).max(10000),savingsBps:z.number().int().min(0).max(10000),donationBps:z.number().int().min(0).max(10000)}).superRefine((value,ctx)=>{if(value.expensesBps+value.savingsBps+value.donationBps!==10000)ctx.addIssue({code:"custom",message:"אחוזי החלוקה חייבים להסתכם ב-100%"});});

function localDateRange(timezone:string){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 const today=new Date(Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day)));
 const weekday=today.getUTCDay();
 const weekStart=new Date(today);weekStart.setUTCDate(today.getUTCDate()-weekday);
 const nextWeek=new Date(weekStart);nextWeek.setUTCDate(weekStart.getUTCDate()+7);
 return {today,weekStart,nextWeek};
}
const taskSchema=z.object({
 title:z.string().trim().min(1).max(80),
 frequency:z.enum(["DAILY","WEEKLY"]),
 amountAgorot:z.number().int().positive().max(2147483647),
 weeklyRequiredCount:z.number().int().min(2).max(7).default(3)
});

const incomeSchema=z.object({amountAgorot:z.number().int().positive().max(2147483647),idempotencyKey:z.string().min(8).max(100),note:z.string().trim().max(160).optional()});
app.get("/allocation",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const policy=await prisma.allocationPolicy.findUnique({where:{familyId:user.familyId},select:{expensesBps:true,savingsBps:true,donationBps:true,effectiveAt:true}});
 return {policy};
});
app.put("/allocation",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const parsed=allocationSchema.safeParse(request.body);
 if(!parsed.success)return reply.code(400).send({error:"invalid_allocation",details:parsed.error.flatten().fieldErrors});
 try{validatePercentages(parsed.data);}catch{return reply.code(400).send({error:"invalid_allocation"});}
 const policy=await prisma.allocationPolicy.update({where:{familyId:user.familyId},data:{...parsed.data,effectiveAt:new Date()},select:{expensesBps:true,savingsBps:true,donationBps:true,effectiveAt:true}});
 return {policy};
});
app.get("/children/:childId/allocation",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null}});if(!child)return reply.code(404).send({error:"child_not_found"});
 const policy=await prisma.childAllocationPolicy.findUnique({where:{childId:child.id},select:{expensesBps:true,savingsBps:true,donationBps:true,effectiveAt:true}});
 return {policy};
});
app.put("/children/:childId/allocation",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
 const parsed=allocationSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"invalid_allocation"});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null}});if(!child)return reply.code(404).send({error:"child_not_found"});
 const policy=await prisma.childAllocationPolicy.upsert({where:{childId:child.id},create:{childId:child.id,...parsed.data},update:{...parsed.data,effectiveAt:new Date()},select:{expensesBps:true,savingsBps:true,donationBps:true,effectiveAt:true}});
 return {policy};
});

app.get("/children/:childId/tasks",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},select:{id:true,family:{select:{timezone:true}}}});
 if(!child)return reply.code(404).send({error:"child_not_found"});
 const {today,weekStart,nextWeek}=localDateRange(child.family.timezone);
 const tasks=await prisma.purseTask.findMany({where:{childId:child.id,active:true},orderBy:{createdAt:"asc"},include:{approvals:{where:{completedOn:{gte:weekStart,lt:nextWeek}},select:{completedOn:true}}}});
 return {tasks:tasks.map(task=>({id:task.id,title:task.title,frequency:task.frequency,amountAgorot:task.amountAgorot,weeklyRequiredCount:task.weeklyRequiredCount,approvedCountThisWeek:task.approvals.length,approvedToday:task.approvals.some(a=>a.completedOn.getTime()===today.getTime()),weekStart:weekStart.toISOString().slice(0,10)}))};
});
app.post("/children/:childId/tasks",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);const parsed=taskSchema.safeParse(request.body);
 if(!params.success||!parsed.success)return reply.code(400).send({error:"invalid_task",details:parsed.success?undefined:parsed.error.flatten().fieldErrors});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},select:{id:true}});
 if(!child)return reply.code(404).send({error:"child_not_found"});
 const task=await prisma.purseTask.create({data:{childId:child.id,title:parsed.data.title,frequency:parsed.data.frequency,amountAgorot:parsed.data.amountAgorot,weeklyRequiredCount:parsed.data.frequency==="DAILY"?1:parsed.data.weeklyRequiredCount}});
 return reply.code(201).send({task:{id:task.id,title:task.title,frequency:task.frequency,amountAgorot:task.amountAgorot,weeklyRequiredCount:task.weeklyRequiredCount,approvedCountThisWeek:0,approvedToday:false}});
});
app.delete("/children/:childId/tasks/:taskId",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid(),taskId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_task"});
 const result=await prisma.purseTask.updateMany({where:{id:params.data.taskId,childId:params.data.childId,child:{familyId:user.familyId,archivedAt:null},active:true},data:{active:false}});
 if(!result.count)return reply.code(404).send({error:"task_not_found"});
 return {ok:true};
});
app.post("/children/:childId/tasks/:taskId/approve",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid(),taskId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_task"});
 try{
  const result=await prisma.$transaction(async tx=>{
   const task=await tx.purseTask.findFirst({where:{id:params.data.taskId,childId:params.data.childId,active:true,child:{familyId:user.familyId,archivedAt:null}},include:{child:{select:{familyId:true,family:{select:{timezone:true}}}}}});
   if(!task)throw Object.assign(new Error("task_not_found"),{code:"TASK_NOT_FOUND"});
   await tx.$queryRawUnsafe('SELECT "id" FROM "PurseTask" WHERE "id" = $1::uuid FOR UPDATE',task.id);
   const {today,weekStart,nextWeek}=localDateRange(task.child.family.timezone);
   if(task.frequency==="WEEKLY"){
    const currentCount=await tx.taskApproval.count({where:{taskId:task.id,completedOn:{gte:weekStart,lt:nextWeek}}});
    if(currentCount>=task.weeklyRequiredCount)throw Object.assign(new Error("task_weekly_completed"),{code:"TASK_WEEKLY_COMPLETED"});
   }
   const approval=await tx.taskApproval.create({data:{taskId:task.id,completedOn:today,approvedById:user.id}});
   const approvedCountThisWeek=task.frequency==="DAILY"?1:await tx.taskApproval.count({where:{taskId:task.id,completedOn:{gte:weekStart,lt:nextWeek}}});
   let credited=task.frequency==="DAILY";
   let rewardKey="task:"+task.id+":"+today.toISOString().slice(0,10);
   if(task.frequency==="WEEKLY"&&approvedCountThisWeek>=task.weeklyRequiredCount){
    const reward=await tx.taskReward.createMany({data:[{taskId:task.id,weekStart}],skipDuplicates:true});
    if(reward.count===1){credited=true;rewardKey="task-week:"+task.id+":"+weekStart.toISOString().slice(0,10);}
   }
   if(credited){
    const child=await tx.child.findUnique({where:{id:task.childId},include:{purses:true,allocation:true,goals:{where:{active:true,redeemedAt:null},orderBy:{createdAt:"desc"},take:1}}});
    if(!child||!child.allocation)throw Object.assign(new Error("allocation_missing"),{code:"ALLOCATION_MISSING"});
    const byType=new Map(child.purses.map(p=>[p.type,p]));
    const expenses=byType.get("EXPENSES"),savings=byType.get("SAVINGS"),donation=byType.get("DONATION");
    if(!expenses||!savings||!donation)throw Object.assign(new Error("purses_missing"),{code:"PURSES_MISSING"});
    const savingsTotal=await tx.ledgerEntry.aggregate({where:{purseId:savings.id},_sum:{amountAgorot:true}});
    const savingsBalance=savingsTotal._sum.amountAgorot??0;
    const goal=child.goals[0];
    const allocation=allocateIncome(task.amountAgorot,child.allocation,savingsBalance,goal?.targetAgorot??null);
    const rows=[{purseId:expenses.id,amountAgorot:allocation.expenses,suffix:"expenses"},{purseId:savings.id,amountAgorot:allocation.savings,suffix:"savings"},{purseId:donation.id,amountAgorot:allocation.donation,suffix:"donation"}];
    await tx.ledgerEntry.createMany({data:rows.map(row=>({familyId:task.child.familyId,purseId:row.purseId,kind:"TASK_REWARD",amountAgorot:row.amountAgorot,idempotencyKey:rewardKey+":"+row.suffix,note:"תגמול משימה: "+task.title}))});
    const achieved=goal&&savingsBalance+allocation.savings>=goal.targetAgorot;
    if(achieved&&!goal.achievedAt)await tx.savingsGoal.update({where:{id:goal.id},data:{achievedAt:new Date()}});
   }
   return {credited,amountAgorot:credited?task.amountAgorot:0,approvedCountThisWeek,weeklyRequiredCount:task.weeklyRequiredCount,frequency:task.frequency};
  });
  return reply.code(201).send(result);
 }catch(error){
  const code=typeof error==="object"&&error!==null&&"code" in error?(error as {code?:string}).code:undefined;
  if(code==="P2002")return reply.code(409).send({error:"task_already_approved_today"});
  if(code==="TASK_WEEKLY_COMPLETED")return reply.code(409).send({error:"task_weekly_completed"});
  if(code==="TASK_NOT_FOUND")return reply.code(404).send({error:"task_not_found"});
  if(code==="ALLOCATION_MISSING"||code==="PURSES_MISSING")return reply.code(409).send({error:"family_setup_incomplete"});
  throw error;
 }
});

const savingsGoalSchema=z.object({title:z.string().trim().min(1).max(80),targetAgorot:z.number().int().positive().max(2147483647)});
const savingsWithdrawSchema=z.object({amountAgorot:z.number().int().positive().max(2147483647),idempotencyKey:z.string().min(8).max(100),note:z.string().trim().max(160).optional()});

app.get("/children/:childId/savings-goal",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);if(!params.success)return reply.code(400).send({error:"invalid_child"});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},include:{purses:{where:{type:"SAVINGS"},select:{id:true}}}});
 if(!child)return reply.code(404).send({error:"child_not_found"});
 const purse=child.purses[0];if(!purse)return reply.code(409).send({error:"family_setup_incomplete"});
 const total=await prisma.ledgerEntry.aggregate({where:{purseId:purse.id},_sum:{amountAgorot:true}});
 const balanceAgorot=total._sum.amountAgorot??0;
 let goal=await prisma.savingsGoal.findFirst({where:{childId:child.id,active:true,redeemedAt:null},orderBy:{createdAt:"desc"}});
 if(goal&&balanceAgorot>=goal.targetAgorot&&!goal.achievedAt)goal=await prisma.savingsGoal.update({where:{id:goal.id},data:{achievedAt:new Date()}});
 return {goal,balanceAgorot,withdrawalsUnlocked:!goal||Boolean(goal.achievedAt)};
});

app.put("/children/:childId/savings-goal",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);const parsed=savingsGoalSchema.safeParse(request.body);
 if(!params.success||!parsed.success)return reply.code(400).send({error:"invalid_savings_goal"});
 const child=await prisma.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},include:{purses:{where:{type:"SAVINGS"},select:{id:true}}}});
 if(!child)return reply.code(404).send({error:"child_not_found"});
 const purse=child.purses[0];if(!purse)return reply.code(409).send({error:"family_setup_incomplete"});
 const total=await prisma.ledgerEntry.aggregate({where:{purseId:purse.id},_sum:{amountAgorot:true}});
 const balanceAgorot=total._sum.amountAgorot??0;
 const achievedAt=balanceAgorot>=parsed.data.targetAgorot?new Date():null;
 const existing=await prisma.savingsGoal.findFirst({where:{childId:child.id,active:true,redeemedAt:null},orderBy:{createdAt:"desc"}});
 const goal=existing
  ?await prisma.savingsGoal.update({where:{id:existing.id},data:{title:parsed.data.title,targetAgorot:parsed.data.targetAgorot,achievedAt}})
  :await prisma.savingsGoal.create({data:{childId:child.id,title:parsed.data.title,targetAgorot:parsed.data.targetAgorot,achievedAt}});
 return reply.code(existing?200:201).send({goal,balanceAgorot,withdrawalsUnlocked:Boolean(achievedAt)});
});

app.post("/children/:childId/savings/withdraw",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);const parsed=savingsWithdrawSchema.safeParse(request.body);
 if(!params.success||!parsed.success)return reply.code(400).send({error:"invalid_withdrawal"});
 try{
  const result=await prisma.$transaction(async tx=>{
   const child=await tx.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},include:{purses:{where:{type:"SAVINGS"},select:{id:true}}}});
   if(!child)throw Object.assign(new Error("child_not_found"),{code:"CHILD_NOT_FOUND"});
   const purse=child.purses[0];if(!purse)throw Object.assign(new Error("purses_missing"),{code:"PURSES_MISSING"});
   await tx.$queryRawUnsafe('SELECT "id" FROM "Purse" WHERE "id" = $1::uuid FOR UPDATE',purse.id);
   const total=await tx.ledgerEntry.aggregate({where:{purseId:purse.id},_sum:{amountAgorot:true}});
   const balanceAgorot=total._sum.amountAgorot??0;
   const goal=await tx.savingsGoal.findFirst({where:{childId:child.id,active:true,redeemedAt:null},orderBy:{createdAt:"desc"}});
   if(goal&&balanceAgorot>=goal.targetAgorot&&!goal.achievedAt)await tx.savingsGoal.update({where:{id:goal.id},data:{achievedAt:new Date()}});
   if(goal&&!goal.achievedAt&&balanceAgorot<goal.targetAgorot)throw Object.assign(new Error("savings_goal_locked"),{code:"SAVINGS_GOAL_LOCKED"});
   if(parsed.data.amountAgorot>balanceAgorot)throw Object.assign(new Error("insufficient_savings"),{code:"INSUFFICIENT_SAVINGS"});
   const entry=await tx.ledgerEntry.create({data:{familyId:user.familyId,purseId:purse.id,kind:"SAVINGS_GOAL_REDEEMED",amountAgorot:-parsed.data.amountAgorot,idempotencyKey:"savings-withdraw:"+parsed.data.idempotencyKey,note:parsed.data.note??"משיכה מקופת חיסכון"}});
   return {entryId:entry.id,withdrawnAgorot:parsed.data.amountAgorot,balanceAgorot:balanceAgorot-parsed.data.amountAgorot};
  });
  return reply.code(201).send(result);
 }catch(error){
  const code=typeof error==="object"&&error!==null&&"code" in error?(error as {code?:string}).code:undefined;
  if(code==="P2002")return reply.code(409).send({error:"duplicate_withdrawal"});
  if(code==="CHILD_NOT_FOUND")return reply.code(404).send({error:"child_not_found"});
  if(code==="PURSES_MISSING")return reply.code(409).send({error:"family_setup_incomplete"});
  if(code==="SAVINGS_GOAL_LOCKED")return reply.code(409).send({error:"savings_goal_locked"});
  if(code==="INSUFFICIENT_SAVINGS")return reply.code(409).send({error:"insufficient_savings"});
  throw error;
 }
});

app.post("/children/:childId/income",async(request,reply)=>{
 const user=await requireParent(request,reply);if(!user)return;
 const params=z.object({childId:z.string().uuid()}).safeParse(request.params);
 const parsed=incomeSchema.safeParse(request.body);
 if(!params.success||!parsed.success)return reply.code(400).send({error:"invalid_income"});
 try{
  const result=await prisma.$transaction(async tx=>{
   const child=await tx.child.findFirst({where:{id:params.data.childId,familyId:user.familyId,archivedAt:null},include:{purses:true}});
   if(!child)throw Object.assign(new Error("child_not_found"),{code:"CHILD_NOT_FOUND"});
   const byType=new Map(child.purses.map(p=>[p.type,p]));
   const expenses=byType.get("EXPENSES"),savings=byType.get("SAVINGS"),donation=byType.get("DONATION");
   if(!expenses||!savings||!donation)throw Object.assign(new Error("purses_missing"),{code:"PURSES_MISSING"});
   let policy=await tx.childAllocationPolicy.findUnique({where:{childId:child.id}});
   const familyPolicy=await tx.allocationPolicy.findUnique({where:{familyId:user.familyId}});
   type Split = {expensesBps:number;savingsBps:number;donationBps:number};
   const isValidSplit=(value:Split|null|undefined):value is Split=>{
    if(!value)return false;
    const values=[value.expensesBps,value.savingsBps,value.donationBps];
    return values.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=10000)&&values.reduce((sum,v)=>sum+v,0)===10000;
   };
   // Repair legacy/corrupt saved splits before allocating a deposit.
   if(!isValidSplit(policy)){
    const fallback:Split=isValidSplit(familyPolicy)?{
     expensesBps:familyPolicy.expensesBps,savingsBps:familyPolicy.savingsBps,donationBps:familyPolicy.donationBps
    }:{expensesBps:5000,savingsBps:3000,donationBps:2000};
    policy=await tx.childAllocationPolicy.upsert({
     where:{childId:child.id},
     create:{childId:child.id,expensesBps:fallback.expensesBps,savingsBps:fallback.savingsBps,donationBps:fallback.donationBps,effectiveAt:familyPolicy?.effectiveAt??new Date()},
     update:{expensesBps:fallback.expensesBps,savingsBps:fallback.savingsBps,donationBps:fallback.donationBps,effectiveAt:new Date()}
    });
   }
   if(!policy)throw new Error("allocation_policy_missing");
   const savingsTotal=await tx.ledgerEntry.aggregate({where:{purseId:savings.id},_sum:{amountAgorot:true}});
   const savingsBalance=savingsTotal._sum.amountAgorot??0;
   const goal=await tx.savingsGoal.findFirst({where:{childId:child.id,active:true,redeemedAt:null},orderBy:{createdAt:"desc"}});
   const allocation=allocateIncome(parsed.data.amountAgorot,{expensesBps:policy.expensesBps,savingsBps:policy.savingsBps,donationBps:policy.donationBps},savingsBalance,goal?.targetAgorot??null);
   const rows=[{purseId:expenses.id,amountAgorot:allocation.expenses,suffix:"expenses"},{purseId:savings.id,amountAgorot:allocation.savings,suffix:"savings"},{purseId:donation.id,amountAgorot:allocation.donation,suffix:"donation"}];
   await tx.ledgerEntry.createMany({data:rows.map(row=>({familyId:user.familyId,purseId:row.purseId,kind:"INCOME_ALLOCATION",amountAgorot:row.amountAgorot,idempotencyKey:parsed.data.idempotencyKey+":"+row.suffix,note:parsed.data.note??"הפקדת דמי כיס"}))});
   const achieved=goal&&savingsBalance+allocation.savings>=goal.targetAgorot;
   if(achieved&&!goal.achievedAt)await tx.savingsGoal.update({where:{id:goal.id},data:{achievedAt:new Date()}});
   return {childId:child.id,allocation,savingsGoalAchieved:Boolean(achieved)};
  });
  return reply.code(201).send(result);
 }catch(error){
  const code=typeof error==="object"&&error!==null&&"code" in error?(error as {code?:string}).code:undefined;
  if(code==="P2002")return reply.code(409).send({error:"duplicate_income"});
  if(code==="CHILD_NOT_FOUND")return reply.code(404).send({error:"child_not_found"});
  if(code==="PURSES_MISSING"||code==="ALLOCATION_MISSING")return reply.code(409).send({error:"family_setup_incomplete"});
  throw error;
 }
});

app.setErrorHandler((error,_request,reply)=>{
  app.log.error(error);
  const candidate=error as {statusCode?:unknown};
  const statusCode=typeof candidate.statusCode==="number"?candidate.statusCode:500;
  reply.status(statusCode<500?statusCode:500).send({error:statusCode<500?"request_error":"internal_error"});
});
app.addHook("onClose",async()=>{await prisma.$disconnect();});

try { await app.listen({port:env.PORT,host:env.HOST}); }
catch(error) { app.log.error(error); await prisma.$disconnect(); process.exit(1); }
