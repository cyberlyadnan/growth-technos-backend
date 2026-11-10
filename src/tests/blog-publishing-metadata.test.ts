import { completeSeoOverride } from '../scripts/seed-data/blog-seeder.helpers';
describe('publishing complete SEO metadata', () => {
  it('preserves complete concise overrides and uses editorial fallbacks for overlong or clipped text', () => {
    expect(completeSeoOverride('ERP Software Cost in India', 70)).toBe(
      'ERP Software Cost in India',
    );
    expect(completeSeoOverride('x'.repeat(71), 70)).toBe('');
    expect(completeSeoOverride('Ready-Made vs C…', 70)).toBe('');
  });
});
