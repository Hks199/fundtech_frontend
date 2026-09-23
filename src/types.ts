export interface Product { product_id: string; current_quantity: string; total_inventory_cost: string; average_cost_per_unit: string }
export interface Batch { id: string; original_quantity: number; remaining_quantity: number; unit_price: string; occurred_at: string }
export interface Allocation { batch_id: string; quantity: number; unit_price: string | number; cost: string | number }
export interface Entry { event_id: string; product_id: string; event_type: 'purchase' | 'sale'; status: 'applied' | 'rejected'; reason: string | null; occurred_at: string; processed_at: string; quantity: number | null; unit_price: string | null; total_cost: string | null; allocations: Allocation[] | null }
export interface EventInput { event_id: string; product_id: string; event_type: 'purchase' | 'sale'; quantity: number; unit_price?: number; timestamp: string }
export interface EventStatus { event_id: string; status: 'applied' | 'rejected'; reason: string | null }
export interface PendingEvent { event_id: string; product_id: string; event_type: string; status: 'queued' | 'applied' | 'rejected' | 'unknown'; reason?: string | null }
export interface InventoryApi {
  products: () => Promise<{ products: Product[] }>;
  ledger: (offset?: number, product?: string, limit?: number) => Promise<{ entries: Entry[] }>;
  batches: (product: string) => Promise<{ batches: Batch[] }>;
  publish: (event: EventInput) => Promise<{ event_id: string; status: 'queued' }>;
  status: (id: string) => Promise<EventStatus | null>;
}
