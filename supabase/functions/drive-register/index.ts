// Server-to-server integration. Never place DRIVE_SYNC_TOKEN in the website.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.115.0';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const eventId='suratgarh-2026';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function tokenMatches(candidate:string){const secret=Deno.env.get('DRIVE_SYNC_TOKEN');if(!secret||secret.length<32)return false;const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,b]=await Promise.all([hash(candidate),hash(secret)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 const header=req.headers.get('Authorization')||'';
 if(!header.startsWith('Bearer ')||!await tokenMatches(header.slice(7)))return json({error:'Unauthorised.'},401);
 // No CORS headers: this endpoint is for the private Apps Script integration.
 if(Number(req.headers.get('Content-Length'))>8192)return json({error:'Request too large.'},413);
 let body;try{const raw=await req.text();if(raw.length>8192)return json({error:'Request too large.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(body.action==='list'){
  const cursor=typeof body.cursor==='string'?body.cursor:'';
  if(cursor&&!/^[0-9a-f-]{36}$/i.test(cursor))return json({error:'Invalid cursor.'},400);
  let query=admin.from('registrations').select('id,created_at,full_name,mobile,email,dob,gender,participant_type,city,race,fee_paise,tshirt,blood_group,emergency_contact,transaction_id,payment_status,receipt_path,reviewed_at').eq('event_id',eventId).order('id',{ascending:true}).limit(100);
  if(cursor)query=query.gt('id',cursor);
  const {data,error}=await query;if(error)return json({error:'Could not read participant records.'},503);
  return json({records:data,next_cursor:data.length===100?data[data.length-1].id:null});
 }
 if(body.action==='receipt'){
  if(typeof body.registration_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.registration_id))return json({error:'Invalid registration reference.'},400);
  const {data:record,error}=await admin.from('registrations').select('receipt_path').eq('event_id',eventId).eq('id',body.registration_id).single();if(error||!record)return json({error:'Entry not found.'},404);
  const {data:signed,error:signError}=await admin.storage.from('payment-receipts').createSignedUrl(record.receipt_path,60);
  if(signError)return json({error:'Could not read screenshot.'},503);
  return json({signed_url:signed.signedUrl});
 }
 if(body.action==='review'){
  const reviewer=Deno.env.get('DRIVE_ORGANIZER_USER_ID');
  if(!reviewer)return json({error:'Organiser review identity is not configured.'},409);
  if(typeof body.registration_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.registration_id)||!['verified','rejected'].includes(body.status))return json({error:'Invalid review decision.'},400);
  const note=typeof body.note==='string'?body.note.trim().slice(0,1000):'';
  const {data:record,error}=await admin.from('registrations').select('id,payment_status,reviewed_at').eq('event_id',eventId).eq('id',body.registration_id).single();
  if(error||!record)return json({error:'Entry not found.'},404);
  if(record.payment_status===body.status)return json({status:record.payment_status,reviewed_at:record.reviewed_at});
  if(record.payment_status!=='pending_review')return json({error:'This payment has already been reviewed. Contact the database administrator to correct it.'},409);
  // The database trigger checks the configured reviewer is an active organiser.
  const {data:updated,error:reviewError}=await admin.from('registrations').update({payment_status:body.status,reviewed_by:reviewer,review_note:note}).eq('id',record.id).eq('payment_status','pending_review').select('payment_status,reviewed_at').single();
  if(reviewError)return json({error:'Review could not be published. Check the organiser role and try again.'},409);
  return json({status:updated.payment_status,reviewed_at:updated.reviewed_at});
 }
 return json({error:'Unknown action.'},400);
});
