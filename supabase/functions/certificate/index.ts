import {createClient} from '@supabase/supabase-js';
import {renderCertificate} from './render.ts';

const allowedOrigins=(Deno.env.get('ALLOWED_ORIGIN')||'https://sportsofficer-sys.github.io').split(',').map(value=>value.trim());
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(allowedOrigins.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'});
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowedOrigins.includes(origin))return json({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if(!token)return json({error:'Sign in to download your certificate.'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user||!user.email_confirmed_at||user.is_anonymous)return json({error:'Verified email sign-in is required.'},401);
  let body;
  try{if(Number(req.headers.get('content-length'))>2048)return json({error:'Request too large.'},413);const raw=await req.text();if(raw.length>2048)return json({error:'Request too large.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body)||!uuid.test(body.registration_id||'')||!['completion','participation'].includes(body.kind))return json({error:'Choose a registration and certificate type.'},400);
  const {data:context,error:contextError}=await admin.rpc('prepare_certificate_backend',{p_actor:user.id,p_registration:body.registration_id,p_kind:body.kind});
  if(contextError||!context)return json({error:contextError?.code==='42501'?'Registration access denied.':'Certificate is not ready. A valid result and approved certificate setup are required.'},contextError?.code==='42501'?403:409);
  let certificate=context.certificate;
  try{
    if(certificate.status!=='ready'){
      const [{data:signature,error:signatureError},{data:font,error:fontError}]=await Promise.all([
        admin.storage.from('certificate-signatures').download(context.signature_object_path),
        admin.storage.from('certificate-fonts').download(context.font_object_path),
      ]);
      if(signatureError||fontError||!signature||!font||signature.size>2097152||font.size>10485760)return json({error:'Approved certificate assets are unavailable. Contact the organising team.'},409);
      let fallbackFontBytes:Uint8Array|undefined;
      if(context.fallback_font_object_path){const {data:fallback,error:fallbackError}=await admin.storage.from('certificate-fonts').download(context.fallback_font_object_path);if(fallbackError||!fallback||fallback.size>10485760)return json({error:'The approved certificate font is unavailable.'},409);fallbackFontBytes=new Uint8Array(await fallback.arrayBuffer());}
      let pdf=await renderCertificate({number:certificate.certificate_number,kind:certificate.kind,verificationUrl:context.verification_url,snapshot:certificate.snapshot,signature:new Uint8Array(await signature.arrayBuffer()),fontBytes:new Uint8Array(await font.arrayBuffer()),fallbackFontBytes});
      const path=`${certificate.registration_id}/${certificate.id}.pdf`;
      const {error:uploadError}=await admin.storage.from('event-certificates').upload(path,pdf,{contentType:'application/pdf',upsert:false});
      if(uploadError){
        // Another retry may have uploaded the same immutable certificate already.
        const {data:existing,error:existingError}=await admin.storage.from('event-certificates').download(path);
        if(existingError||!existing)throw new Error('Private certificate storage unavailable');
        pdf=new Uint8Array(await existing.arrayBuffer());
      }
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pdf))).map(value=>value.toString(16).padStart(2,'0')).join('');
      const {data:completed,error:completionError}=await admin.rpc('complete_certificate_backend',{p_certificate:certificate.id,p_sha256:hash});
      if(completionError||!completed)return json({error:'The result changed while generating the certificate. Refresh your entry before trying again.'},409);
      certificate=completed;
    }
    const {data:signed,error:signError}=await admin.storage.from('event-certificates').createSignedUrl(certificate.object_path,120,{download:`${certificate.certificate_number}.pdf`});
    if(signError||!signed)throw new Error('Download unavailable');
    return json({certificate_number:certificate.certificate_number,download_url:signed.signedUrl,expires_in:120,verification_url:context.verification_url,signature_type:'approved visual facsimile'});
  }catch{return json({error:'Certificate generation could not finish. Your result remains saved; please retry or contact the organising team.'},503);}
});
