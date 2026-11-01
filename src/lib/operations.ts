import type { Database, Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
export type Operation = Database['public']['Tables']['commercial_operations']['Row'];
export type Terms = { quantity_kg: number; price: number; currency: string; price_unit: string; unit_weight_kg: number | null; quality_terms: string; delivery_terms: string; estimated_date: string; modality: string };
export const termsOf = (o: Operation) => o.terms as unknown as Terms;
export const STATUS: Record<string,string> = { agreement_declared:'Acuerdo pendiente', reserved:'Acuerdo bilateral · Reservado', executing:'En ejecución', partial_delivery:'Entrega parcial', complete_delivery:'Entrega completa', finalized:'Finalizada', cancelled:'Cancelada' };
export const COMMISSION: Record<string,string> = { estimated:'Estimada', calculated:'Calculada', pending_review:'Pendiente de revisión', approved:'Aprobada para facturación', invoiced:'Facturada', collected:'Cobrada', cancelled:'Cancelada' };
export const DOCUMENTS: Record<string,string> = { lpg:'Liquidación Primaria de Granos', invoice:'Factura / comprobante comercial', transport:'Carta de Porte / traslado', delivery:'Constancia de entrega', payment:'Comprobante de pago', other:'Otros' };
export const EVENTS: Record<string,string> = { agreement_declared:'Acuerdo declarado', confirmation_pending:'Confirmación pendiente', confirm:'Acuerdo confirmado y reserva generada', start:'Ejecución iniciada', register_delivery:'Entrega registrada', accept_delivery:'Recepción aceptada', cancel:'Cancelación solicitada', release_remaining:'Liberación solicitada', expire:'Vencimiento solicitado', approve_release:'Liberación aprobada', dispute:'Disputa iniciada', resolve_dispute:'Disputa resuelta', add_document:'Documento adjuntado', approve_waiver:'Justificación aprobada', document_access:'Documento consultado', finalize:'Operación finalizada', declare_payment:'Pago declarado', confirm_payment:'Pago confirmado por receptor', commission:'Decisión de comisión', discrepancy:'Discrepancia informada' };
export async function operationAction(id:string, action:string, data:Record<string,Json|undefined>={}) {
 const documents = ['add_document','approve_waiver','document_access','read_notification'].includes(action);
 const {error}=await supabase.rpc(documents?'operation_document_action':'operation_action',{_id:id,_action:action,_data:data});
 if(error) throw error;
}
export function netValue(kg:number, t:Terms) {
 const factor = t.price_unit==='kg'?1:t.price_unit==='qq'?100:t.price_unit==='t'?1000:t.unit_weight_kg;
 if(!factor || factor<=0) throw new Error('Indicá el peso por unidad');
 return Math.round(kg/factor*t.price*100)/100;
}
export const commissionValue = (kg:number,t:Terms,rate=0.005) => Math.round(netValue(kg,t)*rate*100)/100;