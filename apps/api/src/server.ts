import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient, UserRole } from "@prisma/client";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

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


const childSchema=z.object({name:z.string().trim().min(1).max(60),birthYear:z.number().int().min(2000).max(new Date().getFullYear()).optional()});
async function requireParent(request:FastifyRequest,reply:FastifyReply){
  const user=await currentUser(request);
  if(!user){await reply.code(401).send({error:"not_authenticated"});return null;}
  if(user.role!==UserRole.PARENT){await reply.code(403).send({error:"parent_access_required"});return null;}
  return user;
}
app.get("/children",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const children=await prisma.child.findMany({where:{familyId:user.familyId},orderBy:{createdAt:"asc"},include:{purses:{select:{id:true,type:true}}}});
  const purseIds=children.flatMap(child=>child.purses.map(purse=>purse.id));
  const totals=purseIds.length?await prisma.ledgerEntry.groupBy({by:["purseId"],where:{purseId:{in:purseIds}},_sum:{amountAgorot:true}}):[];
  const balances=new Map(totals.map(item=>[item.purseId,item._sum.amountAgorot??0]));
  return {children:children.map(child=>({id:child.id,name:child.name,birthYear:child.birthYear,purses:child.purses.map(purse=>({id:purse.id,type:purse.type,balanceAgorot:balances.get(purse.id)??0}))}))};
});
app.post("/children",async(request,reply)=>{
  const user=await requireParent(request,reply);if(!user)return;
  const parsed=childSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:"invalid_child",details:parsed.error.flatten().fieldErrors});
  const child=await prisma.$transaction(tx=>tx.child.create({data:{familyId:user.familyId,name:parsed.data.name,birthYear:parsed.data.birthYear,purses:{create:[{type:"EXPENSES"},{type:"SAVINGS"},{type:"DONATION"}]}},include:{purses:{select:{id:true,type:true}}}}));
  return reply.code(201).send({child:{id:child.id,name:child.name,birthYear:child.birthYear,purses:child.purses.map(purse=>({...purse,balanceAgorot:0}))}});
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
