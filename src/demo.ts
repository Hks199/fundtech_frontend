import type { Entry, InventoryApi, Product } from './types';
const products: Product[] = [
  { product_id: 'PRD001', current_quantity: '240', total_inventory_cost: '72000', average_cost_per_unit: '300' },
  { product_id: 'PRD002', current_quantity: '185', total_inventory_cost: '46250', average_cost_per_unit: '250' },
  { product_id: 'PRD003', current_quantity: '96', total_inventory_cost: '62400', average_cost_per_unit: '650' },
  { product_id: 'PRD004', current_quantity: '18', total_inventory_cost: '21600', average_cost_per_unit: '1200' },
  { product_id: 'PRD005', current_quantity: '320', total_inventory_cost: '25600', average_cost_per_unit: '80' },
  { product_id: 'PRD006', current_quantity: '0', total_inventory_cost: '0', average_cost_per_unit: '0' },
];
const entries: Entry[] = Array.from({ length: 24 }, (_, i) => {
  const product = products[i % 5]; const sale = i % 3 === 1; const time = new Date(Date.now() - i * 6 * 3600000).toISOString();
  return { event_id: `preview-event-${i}`, product_id: product.product_id, event_type: sale ? 'sale' : 'purchase', status: 'applied', reason: null, occurred_at: time, processed_at: time, quantity: 10 + i * 3, unit_price: sale ? null : product.average_cost_per_unit, total_cost: sale ? String((10 + i * 3) * Number(product.average_cost_per_unit)) : null, allocations: sale ? [{ batch_id: `batch-${i}`, quantity: 10 + i * 3, unit_price: product.average_cost_per_unit, cost: String((10 + i * 3) * Number(product.average_cost_per_unit)) }] : null };
});
export const demoApi: InventoryApi = {
  products: async () => ({ products }),
  ledger: async (offset = 0, product = '', limit = 10) => ({ entries: entries.filter(e => !product || e.product_id === product).slice(offset, offset + limit) }),
  batches: async product => { const p = products.find(p => p.product_id === product)!; return { batches: Number(p.current_quantity) ? [{ id: `preview-${product}`, original_quantity: Number(p.current_quantity) + 20, remaining_quantity: Number(p.current_quantity), unit_price: p.average_cost_per_unit, occurred_at: new Date(Date.now() - 86400000 * 3).toISOString() }] : [] }; },
  publish: async () => { throw new Error('Sign in to your backend to publish events.'); },
  status: async () => null,
};
