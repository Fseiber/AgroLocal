import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { selectCls } from '@/components/company-form';
import { errorMessage } from '@/lib/market';
import { termsOf, type Operation, type Terms } from '@/lib/operations';
export function AgreementForm({opportunityId,companyId,listingId,quantity,operation}:{opportunityId:string;companyId:string;listingId:string|null;quantity:number;operation?:Operation}) {
 const [open,setOpen]=useState(false), [busy,setBusy]=useState(false);
 const [listing,setListing]=useState(listingId??'');
 const [t,setT]=useState<Terms>(operation?termsOf(operation):{quantity_kg:quantity,price:0,currency:'ARS',price_unit:'t',unit_weight_kg:null,quality_terms:'',delivery_terms:'',estimated_date:'',modality:'direct'});
 const qc=useQueryClient(); const navigate=useNavigate();
 const q=useQuery({queryKey:['agreement-listings',companyId],enabled:open&&!listingId,queryFn:async()=>{const {data,error}=await supabase.from('listings').select('id,code').eq('company_id',companyId).eq('status','active').eq('is_demo',false);if(error)throw error;return data;}});
 if(!open)return <Button variant="outline" onClick={()=>setOpen(true)}>{operation?'Modificar términos':'Registrar acuerdo comercial'}</Button>;
 return <form className="mt-4 space-y-4 border-t pt-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{const {data,error}=await supabase.rpc('propose_operation',{_opportunity:opportunityId,_listing:listing,_terms:{...t},...(operation?{_expected_version:operation.version}:{})});if(error)throw error;await qc.invalidateQueries();if(data)await navigate({to:'/panel/operaciones/$id',params:{id:data}});setOpen(false);}catch(err){toast.error(errorMessage(err));}finally{setBusy(false);}}}>
 <h3 className="text-lg font-bold">{operation?'Nueva versión del acuerdo':'Condiciones del acuerdo'}</h3>
 {!listingId&&<label className="block text-sm">Publicación<select required className={selectCls} value={listing} onChange={e=>setListing(e.target.value)}><option value="">Seleccionar</option>{q.data?.map(l=><option key={l.id} value={l.id}>{l.code}</option>)}</select></label>}
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="text-sm">Cantidad acordada (kg)<Input required type="number" min="0.001" step="0.001" value={t.quantity_kg} onChange={e=>setT({...t,quantity_kg:Number(e.target.value)})}/></label>
 <label className="text-sm">Precio unitario neto, sin IVA<Input required type="number" min="0.01" step="0.01" value={t.price||''} onChange={e=>setT({...t,price:Number(e.target.value)})}/></label>
 <label className="text-sm">Moneda<select className={selectCls} value={t.currency} onChange={e=>setT({...t,currency:e.target.value})}><option>ARS</option><option>USD</option></select></label>
 <label className="text-sm">Unidad de precio<select className={selectCls} value={t.price_unit} onChange={e=>setT({...t,price_unit:e.target.value})}>{['kg','qq','t','bolsa','big_bag'].map(u=><option key={u}>{u}</option>)}</select></label>
 {['bolsa','big_bag'].includes(t.price_unit)&&<label className="text-sm">Peso por unidad (kg)<Input required type="number" min="0.001" step="any" value={t.unit_weight_kg??''} onChange={e=>setT({...t,unit_weight_kg:Number(e.target.value)})}/></label>}
 <label className="text-sm">Fecha estimada de entrega<Input required type="date" value={t.estimated_date} onChange={e=>setT({...t,estimated_date:e.target.value})}/></label>
 <label className="text-sm">Modalidad<select className={selectCls} value={t.modality} onChange={e=>setT({...t,modality:e.target.value})}><option value="direct">Venta directa</option><option value="consignment">Consignación</option></select></label>
 <label className="text-sm">Calidad acordada<Input required value={t.quality_terms} onChange={e=>setT({...t,quality_terms:e.target.value})}/></label>
 <label className="text-sm">Condiciones de entrega<Input required value={t.delivery_terms} onChange={e=>setT({...t,delivery_terms:e.target.value})}/></label>
 </div>
 <div className="flex gap-2"><Button disabled={busy} type="submit">Declarar y solicitar confirmación</Button><Button type="button" variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Button></div>
 </form>;
}