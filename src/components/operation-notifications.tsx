import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { EVENTS, operationAction } from '@/lib/operations';
import { errorMessage } from '@/lib/market';
export function OperationNotifications({companyId}:{companyId:string}) {
 const qc=useQueryClient();const q=useQuery({queryKey:['operation-notifications',companyId],refetchInterval:30000,queryFn:async()=>{const {data,error}=await supabase.from('operation_notifications').select('*').eq('company_id',companyId).is('read_at',null).order('created_at',{ascending:false}).limit(15);if(error)throw error;return data;}});
 return <section className="border-b pb-4"><h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5"/>Notificaciones {q.data?.length?`(${q.data.length})`:''}</h2>{q.data?.length===0&&<p className="mt-2 text-sm text-muted-foreground">Sin notificaciones pendientes.</p>}{q.data?.map(n=><div key={n.id} className="mt-2 flex flex-wrap items-center justify-between gap-2"><Link to="/panel/operaciones/$id" params={{id:n.operation_id}} className="text-sm underline">{EVENTS[n.event]??n.event} · {new Date(n.created_at).toLocaleDateString('es-AR')}</Link><Button variant="ghost" size="sm" onClick={async()=>{try{await operationAction(n.operation_id,'read_notification');await qc.invalidateQueries({queryKey:['operation-notifications']});}catch(e){toast.error(errorMessage(e));}}}>Marcar leído</Button></div>)}</section>;
}