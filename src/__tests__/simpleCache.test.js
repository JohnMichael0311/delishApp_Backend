import { cache } from '../utils/simpleCache.js';

describe('SimpleCache core functionality', () => {
  it('should set and get a value', async () => {
    await cache.set('test:key', 'value', 10);
    const result = await cache.get('test:key');
    expect(result).toBe('value');
  });

  it('should delete a value', async () => {
    await cache.set('test:delete', 'toDelete', 10);
    await cache.delete('test:delete');
    const result = await cache.get('test:delete');
    expect(result).toBeNull();
  });

  it('should expire a value after TTL', async () => {
    await cache.set('test:expire', 'willExpire', 1);
    await new Promise((r) => setTimeout(r, 1200));
    const result = await cache.get('test:expire');
    expect(result).toBeNull();
  });
});
