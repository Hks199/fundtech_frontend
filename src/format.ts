import Decimal from 'decimal.js';
import type { Product, Entry } from './types';
Decimal.set({ precision: 50 });
const currency = import.meta.env.VITE_CURRENCY || 'INR';
let symbol = '₹';
try { symbol = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).formatToParts(0).find(part => part.type === 'currency')?.value || currency; } catch { /* Keep INR fallback for invalid configuration. */ }
export function money(value: Decimal.Value, places = 2) {
  const [integer, fraction] = new Decimal(value).toFixed(places).split('.');
  return `${symbol}${BigInt(integer).toLocaleString('en-IN')}${fraction ? `.${fraction}` : ''}`;
}
export const quantity = (value: string | number | bigint) => BigInt(value).toLocaleString('en-IN');
export const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const totals = (products: Product[]) => ({ value: products.reduce((sum, p) => sum.plus(p.total_inventory_cost), new Decimal(0)), units: products.reduce((sum, p) => sum + BigInt(p.current_quantity), 0n) });
export const entryCost = (entry: Entry) => entry.status === 'rejected' ? null : entry.event_type === 'sale' ? entry.total_cost : entry.quantity !== null && entry.unit_price !== null ? new Decimal(entry.unit_price).times(entry.quantity).toString() : null;
export const reasonText = (reason?: string | null) => reason === 'insufficient_stock' ? 'Insufficient stock to fulfill this sale.' : reason === 'out_of_order_event' ? 'The event is older than the latest transaction for this product.' : reason || 'The backend rejected this event.';
