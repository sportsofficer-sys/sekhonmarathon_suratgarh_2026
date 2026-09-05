import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {renderCertificate} from '../supabase/functions/certificate/render.ts';

const fontBytes=new Uint8Array(await readFile(new URL('./fixtures/NotoSans-Regular.ttf',import.meta.url)));
const fallbackFontBytes=new Uint8Array(await readFile(new URL('./fixtures/NotoSansDevanagari-Regular.ttf',import.meta.url)));
// A transparent one-pixel test PNG, never an official signature.
const signature=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'));
const snapshot={participant_name:'Synthetic Test Runner',registration_number:'TEST26-00001',race:'5',event_date:'04 Oct 2026',elapsed_seconds:1500,timing_provenance:'participant_submitted',signer_name:'Synthetic test signatory',signer_designation:'Test fixture only',event_title:'SYNTHETIC TEST — NOT VALID',organiser:'Test fixture · Not an issued event certificate'};
test('backend renderer creates a one-page PDF with truthful signature metadata and verification QR',async()=>{
  const bytes=await renderCertificate({number:'TEST-ONLY-00001',kind:'completion',verificationUrl:'https://example.test/?certificate=00000000-0000-4000-8000-000000000001',snapshot,signature,fontBytes});
  assert.ok(bytes.length>3000);
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),1);
  assert.match(pdf.getSubject(),/Not a cryptographically digitally signed PDF/);
  assert.match(pdf.getTitle(),/TEST-ONLY/);
});
test('renderer refuses an approved font with missing participant glyphs instead of silently corrupting a name',async()=>{
  await assert.rejects(()=>renderCertificate({number:'TEST-ONLY-00002',kind:'completion',verificationUrl:'https://example.test/',snapshot:{...snapshot,participant_name:'Runner 🦋'},signature,fontBytes}),/does not support/);
});
test('approved Latin and Devanagari fonts support a mixed-script participant name',async()=>{
  const bytes=await renderCertificate({number:'TEST-ONLY-00003',kind:'completion',verificationUrl:'https://example.test/',snapshot:{...snapshot,participant_name:'परीक्षण Test Runner'},signature,fontBytes,fallbackFontBytes});
  assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
});
test('long unbroken names wrap and excessive signatory text fails closed',async()=>{
  const input={number:'TEST-ONLY-00004',kind:'completion',verificationUrl:'https://example.test/',snapshot:{...snapshot,participant_name:'W'.repeat(120)},signature,fontBytes};
  const bytes=await renderCertificate(input);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
  await assert.rejects(()=>renderCertificate({...input,snapshot:{...snapshot,signer_designation:'Long signatory designation '.repeat(20)}}),/do not fit/);
});
