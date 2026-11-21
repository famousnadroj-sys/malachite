import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGIN = "https://famousnadroj-sys.github.io";
const API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODEL = Deno.env.get("MALACHITE_AI_MODEL") || "gemini-3.5-flash-lite";

function respond(status:number, body:Record<string,unknown>, origin:string|null) {
  const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
  if(origin===ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"]=ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body),{status,headers});
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin");
  if(origin && origin!==ALLOWED_ORIGIN) return respond(403,{error:"origin_not_allowed"},origin);
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin"
  }});
  if(req.method!=="POST") return respond(405,{error:"method_not_allowed"},origin);
  const token=(req.headers.get("Authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) return respond(401,{error:"authentication_required"},origin);
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url||!anon) return respond(503,{error:"server_configuration_missing"},origin);
  const client=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await client.auth.getUser(token);
  if(authError||!auth.user) return respond(401,{error:"invalid_session"},origin);
  const {data:isAdmin,error:adminError}=await client.rpc("malachite_ai_manager_is_admin");
  if(adminError||isAdmin!==true) return respond(403,{error:"admin_only"},origin);
  let body:any; try{body=await req.json()}catch{return respond(400,{error:"invalid_json"},origin)}
  const fields=["business","offer","price","audience","location","tone","cta"] as const;
  const input:any={};
  for(const key of fields){const value=typeof body[key]==="string"?body[key].trim():"";if(value.length>300)return respond(400,{error:"field_too_long",field:key},origin);input[key]=value;}
  if(input.business.length<2||input.offer.length<3) return respond(400,{error:"business_and_offer_required"},origin);
  if(!API_KEY) return respond(503,{error:"ai_provider_not_configured"},origin);
  const {count,error:rateError}=await client.from("ai_manager_audit").select("id",{count:"exact",head:true})
    .eq("admin_id",auth.user.id).gte("created_at",new Date(Date.now()-60000).toISOString());
  if(rateError) return respond(503,{error:"audit_unavailable"},origin);
  if((count||0)>=8) return respond(429,{error:"rate_limited"},origin);
  const prompt=[
    "Tu es directeur créatif et rédacteur publicitaire senior. Crée une publicité honnête, élégante, persuasive et adaptée au marché local.",
    "Réponds uniquement avec un objet JSON valide contenant exactement: title (max 65 caractères), subtitle (max 90), description (max 280), cta (max 28), visual_direction (max 180).",
    "N'invente aucun avantage, certification, témoignage, stock, garantie, réduction ou résultat absent des informations fournies. Si un prix est absent, ne l'invente pas. Pas de promesses trompeuses. Français naturel.",
    "Informations de campagne: "+JSON.stringify(input)
  ].join("\n");
  let upstream:Response;
  try{
    upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":API_KEY},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:500,responseMimeType:"application/json"}}),
      signal:AbortSignal.timeout(25000)
    });
  }catch{return respond(502,{error:"ai_provider_unreachable"},origin)}
  let payload:any;try{payload=await upstream.json()}catch{return respond(502,{error:"ai_provider_invalid_response"},origin)}
  if(!upstream.ok){console.error("Ad creative provider error",upstream.status,payload?.error?.status||"UNKNOWN");return respond(502,{error:"ai_provider_error",provider_status:upstream.status},origin)}
  const raw=payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("").trim()||"";
  let creative:any;try{creative=JSON.parse(raw)}catch{return respond(502,{error:"invalid_creative_response"},origin)}
  const clean:any={};
  for(const key of ["title","subtitle","description","cta","visual_direction"]){
    clean[key]=typeof creative[key]==="string"?creative[key].trim().slice(0,key==="description"?280:key==="visual_direction"?180:key==="title"?65:key==="subtitle"?90:28):"";
  }
  if(!clean.title||!clean.description||!clean.cta) return respond(502,{error:"incomplete_creative"},origin);
  const {error:auditError}=await client.from("ai_manager_audit").insert({admin_id:auth.user.id,model:MODEL,status:"success",input_chars:JSON.stringify(input).length,output_chars:JSON.stringify(clean).length});
  if(auditError) return respond(503,{error:"audit_write_failed"},origin);
  return respond(200,{creative:clean,model:MODEL},origin);
});