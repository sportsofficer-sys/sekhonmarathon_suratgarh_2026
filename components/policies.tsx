'use client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import policies from '@/lib/policies.json';
export function PolicyDialog({policy,onClose}:{policy:string;onClose:()=>void}){
 const content=policies[policy as keyof typeof policies];
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="registration-dialog policy-dialog"><DialogTitle>{content.title}</DialogTitle><DialogDescription>Sekhon Marathon 2026 · Air Force Station Suratgarh</DialogDescription><div className="policy-body">{content.sections.map((s,i)=><section key={i}>{s.heading&&<h3>{s.heading}</h3>}<p>{s.body}</p></section>)}</div></DialogContent></Dialog>;
}
