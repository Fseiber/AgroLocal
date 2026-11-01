import { describe, it, expect } from 'vitest';
import { netValue, commissionValue, type Terms } from '@/lib/operations';
const t:Terms={quantity_kg:35000,price:200000,currency:'ARS',price_unit:'t',unit_weight_kg:null,quality_terms:'Acordada',delivery_terms:'Retiro',estimated_date:'2026-11-20',modality:'direct'};
describe('Comisión sobre mercadería aceptada',()=>{
 it('35 toneladas acordadas estiman 0,5 %',()=>expect(commissionValue(35000,t)).toBe(35000));
 it('30 toneladas aceptadas excluyen las 5 pendientes',()=>expect(commissionValue(30000,t)).toBe(30000));
 it('precio por kg consistente',()=>expect(netValue(30000,{...t,price:200,price_unit:'kg'})).toBe(6000000));
 it('precio por quintal consistente',()=>expect(netValue(30000,{...t,price:20000,price_unit:'qq'})).toBe(6000000));
 it('bolsas utilizan peso acordado',()=>expect(netValue(30000,{...t,price:5000,price_unit:'bolsa',unit_weight_kg:25})).toBe(6000000));
 it('big bags utilizan peso acordado',()=>expect(netValue(30000,{...t,price:200000,price_unit:'big_bag',unit_weight_kg:1000})).toBe(6000000));
 it('no asume peso de bolsas',()=>expect(()=>netValue(30000,{...t,price_unit:'bolsa'})).toThrow());
 it('comisión desactivada equivale a cero',()=>expect(commissionValue(30000,t,0)).toBe(0));
});