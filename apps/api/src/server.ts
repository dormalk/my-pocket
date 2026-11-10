import Fastify from "fastify";
import { z } from "zod";

const envSchema=z.object({PORT:z.coerce.number().int().positive().default(4000),HOST:z.string().default("0.0.0.0")});
const env=envSchema.parse(process.env);
const app=Fastify({logger:true,trustProxy:false,bodyLimit:64*1024});

app.get("/health",async()=>({status:"ok",service:"my-pocket-api",mode:"virtual-money-only"}));

app.setErrorHandler((error,_request,reply)=>{
  app.log.error(error);
  reply.status(error.statusCode&&error.statusCode<500?error.statusCode:500).send({error:error.statusCode&&error.statusCode<500?"request_error":"internal_error"});
});

try { await app.listen({port:env.PORT,host:env.HOST}); }
catch(error) { app.log.error(error); process.exit(1); }
