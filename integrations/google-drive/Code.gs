/** Bind this script to the native Google Sheets organiser register.
 * Set Script Properties: SPREADSHEET_ID, RECEIPTS_FOLDER_ID,
 * SUPABASE_DRIVE_ENDPOINT, DRIVE_SYNC_TOKEN. Never paste secrets into cells.
 */
function onOpen(){SpreadsheetApp.getUi().createMenu('Desert Braves').addItem('Import new registrations','syncParticipantsToDrive').addItem('Publish reviewed payments','publishPaymentReviews').addSeparator().addItem('Enable 10-minute imports','enableAutomaticImports').addToUi();}
function settings_(){const p=PropertiesService.getScriptProperties().getProperties();for(const k of ['SPREADSHEET_ID','RECEIPTS_FOLDER_ID','SUPABASE_DRIVE_ENDPOINT','DRIVE_SYNC_TOKEN'])if(!p[k])throw new Error('Set the '+k+' script property first.');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/drive-register$/.test(p.SUPABASE_DRIVE_ENDPOINT))throw new Error('Use the Supabase drive-register function URL.');return p;}
function request_(p,payload){const response=UrlFetchApp.fetch(p.SUPABASE_DRIVE_ENDPOINT,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+p.DRIVE_SYNC_TOKEN},payload:JSON.stringify(payload),muteHttpExceptions:true});let body;try{body=JSON.parse(response.getContentText());}catch{throw new Error('The registration service returned an invalid response.');}if(response.getResponseCode()>=400)throw new Error(body.error||'Registration service unavailable.');return body;}
function safeText_(v){const s=v==null?'':String(v);return /^[=+\-@\t\r\n]/.test(s)?"'"+s:s;}
function assertPrivate_(folder){if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE)throw new Error('The receipts folder must be private. Remove link-wide sharing before syncing.');}
function screenshot_(p,folder,id){
 const files=folder.getFilesByName(id+'.receipt');if(files.hasNext())return files.next().getUrl();
 const signed=request_(p,{action:'receipt',registration_id:id});
 const origin=p.SUPABASE_DRIVE_ENDPOINT.split('/functions/')[0];
 if(typeof signed.signed_url!=='string'||!signed.signed_url.startsWith(origin+'/storage/v1/'))throw new Error('Unexpected screenshot URL.');
 const response=UrlFetchApp.fetch(signed.signed_url,{muteHttpExceptions:true});if(response.getResponseCode()!==200)throw new Error('Screenshot download failed. Run import again.');
 const blob=response.getBlob();if(!['image/jpeg','image/png'].includes(blob.getContentType())||blob.getBytes().length>5242880)throw new Error('Unexpected screenshot type or size.');
 const file=folder.createFile(blob.setName(id+'.receipt'));
 return file.getUrl();
}
function syncParticipantsToDrive(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{
  const started=Date.now(),p=settings_(),book=SpreadsheetApp.openById(p.SPREADSHEET_ID),sheet=book.getSheetByName('Participants'),folder=DriveApp.getFolderById(p.RECEIPTS_FOLDER_ID);assertPrivate_(folder);
  if(!sheet||sheet.getRange('A1').getValue()!=='Registration ID'||sheet.getRange('X1').getValue()!=='Distribution date')throw new Error('The organiser register headers do not match.');
  const last=Math.max(1,sheet.getLastRow());const ids=last>1?sheet.getRange(2,1,last-1,1).getDisplayValues().flat():[];const known=new Set(ids.filter(String));
  let nextRow=2;ids.forEach((id,i)=>{if(id)nextRow=i+3;});
  const props=PropertiesService.getScriptProperties();let cursor=props.getProperty('IMPORT_CURSOR')||'';let added=0;
  do{
   const page=request_(p,{action:'list',cursor:cursor});
   for(const r of page.records){
    if(known.has(r.id))continue;
    if(nextRow>5001)throw new Error('Register capacity reached. Extend the summary ranges before adding more than 5,000 entries.');
    const receiptUrl=screenshot_(p,folder,r.id);
    const gender={male:'Male',female:'Female',other:'Other',prefer_not_to_say:'Prefer not to say'}[r.gender]||r.gender;
    const row=[r.id,new Date(r.created_at),safeText_(r.full_name),safeText_(r.mobile),safeText_(r.email),safeText_(r.dob),gender,r.participant_type==='family'?'Family member':'Air warrior',safeText_(r.city),String(r.race),r.fee_paise/100,r.tshirt,r.blood_group,safeText_(r.emergency_contact),safeText_(r.transaction_id),receiptUrl,r.payment_status,'',r.reviewed_at?new Date(r.reviewed_at):'','','','No','No',''];
    sheet.getRange(nextRow,4).setNumberFormat('@');sheet.getRange(nextRow,14,1,2).setNumberFormat('@');sheet.getRange(nextRow,1,1,24).setValues([row]);
    known.add(r.id);nextRow++;added++;
   }
   cursor=page.next_cursor||'';props.setProperty('IMPORT_CURSOR',cursor);SpreadsheetApp.flush();
   if(Date.now()-started>240000)break;
  }while(cursor);
  book.toast(added+' new entries imported. Existing verification and distribution fields were preserved.','Desert Braves',7);
 }finally{lock.releaseLock();}
}
function publishPaymentReviews(){
 const ui=SpreadsheetApp.getUi();if(ui.alert('Publish payment decisions?','Only rows you have marked verified or rejected, with a reviewer name, will be sent to the registration system. Check each transaction against the actual payment record first.',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw new Error('An import is running. Try again in a moment.');
 try{
  const p=settings_(),book=SpreadsheetApp.openById(p.SPREADSHEET_ID),sheet=book.getSheetByName('Participants');const last=sheet.getLastRow();if(last<2)return;
  const rows=sheet.getRange(2,1,last-1,24).getValues();let published=0;
  rows.forEach((r,i)=>{if(!r[0]||!['verified','rejected'].includes(r[16])||!String(r[17]).trim()||r[18])return;
   const response=request_(p,{action:'review',registration_id:String(r[0]),status:r[16],note:('Drive reviewer: '+r[17]+'. '+(r[19]||'')).slice(0,1000)});
   sheet.getRange(i+2,19).setValue(new Date(response.reviewed_at));published++;
  });
  book.toast(published+' review decisions published.','Desert Braves',7);
 }finally{lock.releaseLock();}
}
function enableAutomaticImports(){
 settings_();ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncParticipantsToDrive').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('syncParticipantsToDrive').timeBased().everyMinutes(10).create();
 SpreadsheetApp.getActiveSpreadsheet().toast('New entries will be imported every 10 minutes. Review decisions remain a manual menu action.','Desert Braves',7);
}
