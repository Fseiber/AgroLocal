import {createClient} from '@supabase/supabase-js';
import {writeFileSync} from 'node:fs';
import { requireIsolatedE2EConfig } from "./safety";
const { url, publishableKey: key, serviceRoleKey: service } = requireIsolatedE2EConfig();
const admin=createClient(url,service,{auth:{persistSession:false}}),users:string[]=[],companies:string[]=[],files:string[]=[];let failures=0;
const check=(name:string,ok:boolean)=>{console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failures++;};
const must=async(p:any)=>{const r=await p;if(r.error)throw r.error;return r.data;};
async function make(tag:string){const email=`phase3.${Date.now()}.${tag}@example.com`,password=`Test-${Date.now()}-Z9!`;const u=await must(admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(u.user.id);const c=createClient(url as string,key as string,{auth:{persistSession:false}});const session=await must(c.auth.signInWithPassword({email,password}));let cuit='';for(let i=0;!cuit;i++){const base='30'+String((Date.now()+i+users.length*817)%100000000).padStart(8,'0');const w=[5,4,3,2,7,6,5,4,3,2];let n=11-w.reduce((s,x,j)=>s+x*Number(base[j]),0)%11;if(n===11)n=0;if(n!==10)cuit=base+n;}
const company=await must(c.rpc('register_company',{_name:`Prueba Fase3 ${tag}`,_cuit:cuit,_province:'Corrientes',_locality:'Prueba',_activity:'Productor',_intent:'both',_phone:'',_email:email}));companies.push(company);return {c,id:u.user.id,company,session:session.session};}
try {
const s=await make('seller'),b=await make('buyer'),x=await make('outsider');await must(admin.from('user_roles').insert({user_id:x.id,role:'admin'}));for(const company of companies)await must(x.c.rpc('set_company_verification',{_company:company,_status:'verified',_note:'Prueba temporal'}));
await must(admin.from('user_roles').delete().eq('user_id',x.id));
const listing=await must(s.c.from('listings').insert({company_id:s.company,created_by:s.id,product_type:'cascara',commercial_type:'Largo fino',original_unit:'t',original_quantity:100,quantity_kg:100000,province:'Corrientes',locality:'Prueba'}).select('*').single());
const quote=await must(b.c.rpc('request_quote',{_company:b.company,_listing:listing.id,_demand:null,_kg:35000}));
const terms={quantity_kg:35000,price:200000,currency:'ARS',price_unit:'t',unit_weight_kg:null,quality_terms:'Humedad acordada',delivery_terms:'Retiro en planta',estimated_date:'2026-11-20',modality:'direct'};
const op=await must(s.c.rpc('propose_operation',{_opportunity:quote.id,_listing:listing.id,_terms:terms}));
const action=(c:any,a:string,d:any={})=>c.rpc('operation_action',{_id:op,_action:a,_data:d});
const read=()=>must(s.c.from('commercial_operations').select('*').eq('id',op).single());
check('seller cannot confirm buyer',!!(await action(s.c,'confirm',{version:1})).error);
await must(action(b.c,'confirm',{version:1}));let stock=await must(s.c.from('listings').select('*').eq('id',listing.id).single());check('35t reserved, 65t available',stock.reserved_kg===35000&&stock.quantity_kg-stock.reserved_kg-stock.sold_kg===65000);
check('direct stock release cannot consume agreement',!!(await s.c.rpc('apply_stock_movement',{_listing:listing.id,_kind:'release',_kg:1000})).error);
check('duplicate confirmation rejected',!!(await action(b.c,'confirm',{version:1})).error);
await must(s.c.rpc('propose_operation',{_opportunity:quote.id,_listing:listing.id,_terms:{...terms,price:210000},_expected_version:1}));let o=await read();check('new price resets buyer acceptance',o.version===2&&!o.buyer_accepted_at&&o.reserved_kg===0);
check('old version rejected',!!(await action(b.c,'confirm',{version:1})).error);await must(action(b.c,'confirm',{version:2}));
const delivery=crypto.randomUUID();await must(action(s.c,'register_delivery',{delivery_id:delivery,quantity_kg:30000}));await must(action(s.c,'register_delivery',{delivery_id:delivery,quantity_kg:30000}));check('delivery idempotent',(await must(s.c.from('operation_deliveries').select('*').eq('operation_id',op))).length===1);
await must(action(b.c,'accept_delivery',{delivery_id:delivery}));await must(action(b.c,'accept_delivery',{delivery_id:delivery}));o=await read();check('30t sold, 5t pending',o.delivered_kg===30000&&o.reserved_kg===5000);check('0.5 percent of accepted net',o.commission_amount===31500);
check('cannot finalize pending reserve',!!(await action(s.c,'finalize')).error);
check('execution cannot expire',!!(await action(s.c,'expire',{note:'Prueba vencimiento'})).error);
await must(action(b.c,'dispute',{note:'Discrepancia temporal'}));
check('dispute blocks release',!!(await action(s.c,'release_remaining',{note:'Prueba'})).error);
await must(admin.from('user_roles').insert({user_id:s.id,role:'admin'}));
await must(action(s.c,'resolve_dispute',{note:'Revisión de prueba'}));
check('admin resolves dispute',!(await read()).dispute_open);
check('outsider cannot read',(await must(x.c.from('commercial_operations').select('*').eq('id',op))).length===0);check('outsider cannot act',!!(await action(x.c,'dispute',{note:'x'})).error);
check('events immutable',!!(await s.c.from('operation_events').insert({operation_id:op,event:'fake',actor:s.id})).error);
const path=`${s.company}/${op}/test.pdf`;files.push(path);await must(s.c.storage.from('operation-docs').upload(path,new Blob(['%PDF-1.4 test'],{type:'application/pdf'})));await must(s.c.rpc('operation_document_action',{_id:op,_action:'add_document',_data:{kind:'invoice',path,file_name:'test.pdf'}}));check('buyer document access',!(await b.c.storage.from('operation-docs').download(path)).error);check('outsider document blocked',!!(await x.c.storage.from('operation-docs').download(path)).error);
await must(action(s.c,'release_remaining',{note:'5t non delivered'}));const events=await must(s.c.from('operation_events').select('*').eq('operation_id',op).eq('event','release_remaining'));await must(action(b.c,'approve_release',{request_id:events[0].id}));
await must(admin.from('commercial_operations').update({required_documents:['transport']}).eq('id',op));
check('required document blocks closure',!!(await action(s.c,'finalize')).error);
await must(s.c.rpc('operation_document_action',{_id:op,_action:'add_document',_data:{kind:'transport',file_name:'Justificación',absence_reason:'Documento no aplicable en prueba'}}));
check('unapproved absence blocks closure',!!(await action(s.c,'finalize')).error);
const waiver=await must(s.c.from('operation_documents').select('*').eq('operation_id',op).eq('kind','transport').single());
await must(s.c.rpc('operation_document_action',{_id:op,_action:'approve_waiver',_data:{document_id:waiver.id,note:'Aprobación de prueba'}}));
await must(action(s.c,'finalize'));o=await read();check('finalized 30t with 5t released',o.status==='finalized'&&o.released_kg===40000&&o.delivered_kg===30000);
check('collected cannot skip review',!!(await action(s.c,'commission',{status:'collected',note:'Evidencia'})).error);
for(const status of ['approved','invoiced','collected'])await must(action(s.c,'commission',{status,note:'Evidencia administrativa de prueba'}));
check('authorized commission transitions',(await read()).commission_status==='collected');
// independent listing tests simultaneous acceptance above stock
const l2=await must(s.c.from('listings').insert({company_id:s.company,created_by:s.id,product_type:'cascara',commercial_type:'Largo fino',original_unit:'t',original_quantity:100,quantity_kg:100000,province:'Corrientes',locality:'Prueba'}).select('*').single());
const ids:string[]=[];for(const buyer of [b,x]){const q=await must(buyer.c.rpc('request_quote',{_company:buyer.company,_listing:l2.id,_demand:null,_kg:60000}));ids.push(await must(s.c.rpc('propose_operation',{_opportunity:q.id,_listing:l2.id,_terms:{...terms,quantity_kg:60000}})));}
const results=await Promise.all([b,x].map((u,i)=>u.c.rpc('operation_action',{_id:ids[i],_action:'confirm',_data:{version:1}})));check('concurrent reserves avoid oversell',results.filter(r=>!r.error).length===1);
const reservedIndex=results.findIndex(r=>!r.error),buyer=[b,x][reservedIndex],cid=ids[reservedIndex];await must(s.c.rpc('operation_action',{_id:cid,_action:'cancel',_data:{note:'Cancelar prueba'}}));const ev=await must(s.c.from('operation_events').select('*').eq('operation_id',cid).eq('event','cancel'));await must(buyer.c.rpc('operation_action',{_id:cid,_action:'approve_release',_data:{request_id:ev[0].id}}));check('cancellation releases stock',(await must(s.c.from('listings').select('*').eq('id',l2.id).single())).reserved_kg===0);
for(const [unit,price,weight] of [['kg',200,null],['qq',20000,null],['t',200000,null],['bolsa',5000,25],['big_bag',200000,1000]])check(`price unit ${unit}`,(await must(s.c.rpc('operation_net_value',{_kg:30000,_terms:{...terms,price_unit:unit,price,unit_weight_kg:weight}})))===6000000);
// Leave temporary signed-in fixture only when explicitly requested by test runner.
if(process.env.PHASE3_BROWSER_FIXTURE==='1'){writeFileSync('/tmp/browser/phase3/fixture.json',JSON.stringify({url,key,seller:s.session,buyer:b.session,operation:op,users,companies,files}));console.log('Browser fixture ready');}else{await admin.storage.from('operation-docs').remove(files);await admin.from('companies').delete().in('id',companies);for(const id of users)await admin.auth.admin.deleteUser(id);}
} catch(e){console.error('FAIL',e);failures++;await admin.storage.from('operation-docs').remove(files);await admin.from('companies').delete().in('id',companies);for(const id of users)await admin.auth.admin.deleteUser(id);}
console.log('FAILURES',failures);if(failures)process.exitCode=1;
