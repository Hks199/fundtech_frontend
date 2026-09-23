import { describe, expect, it } from 'vitest';
import { entryCost, money, quantity, totals } from '../src/format';
import type { Entry } from '../src/types';

describe('backend numeric precision', () => {
  it('adds stock quantities beyond JavaScript safe integer range exactly', () => {
    const result = totals([{ product_id: 'A', current_quantity: '9007199254740993', total_inventory_cost: '0.1', average_cost_per_unit: '0' }, { product_id: 'B', current_quantity: '10', total_inventory_cost: '0.2', average_cost_per_unit: '0' }]);
    expect(result.units).toBe(9007199254741003n);
    expect(result.value.toString()).toBe('0.3');
    expect(quantity('9007199254740993').replaceAll(',', '')).toBe('9007199254740993');
  });
  it('formats large currency values without binary floating point rounding', () => {
    expect(money('9007199254740993.12').replaceAll(',', '')).toBe('₹9007199254740993.12');
    expect(money('0.1234', 4)).toBe('₹0.1234');
  });
  it('uses backend sale cost and leaves rejected events without an invented cost', () => {
    const purchase = { status: 'applied', event_type: 'purchase', quantity: 3, unit_price: '0.1', total_cost: null } as Entry;
    expect(entryCost(purchase)).toBe('0.3');
    expect(entryCost({ ...purchase, event_type: 'sale', total_cost: '0.28' })).toBe('0.28');
    expect(entryCost({ ...purchase, status: 'rejected', quantity: null })).toBeNull();
  });
});
