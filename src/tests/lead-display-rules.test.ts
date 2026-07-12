import { DeviceType, PageType } from '@core/constants/leads';
import { defaultDisplayRules } from '@core/schemas/lead-gen.schema';
import {
  matchesDisplayRules,
  sortByPriorityDesc,
} from '@modules/leads/utils/display-rules';

describe('matchesDisplayRules', () => {
  const base = defaultDisplayRules();

  it('matches everything when targeting arrays are empty', () => {
    expect(
      matchesDisplayRules(base, {
        industry: 'healthcare',
        pageType: PageType.HOME,
        device: DeviceType.MOBILE,
        pagePath: '/',
      }),
    ).toBe(true);
  });

  it('filters by industry when industries are set', () => {
    const rules = { ...base, industries: ['healthcare', 'salons'] };
    expect(matchesDisplayRules(rules, { industry: 'healthcare' })).toBe(true);
    expect(matchesDisplayRules(rules, { industry: 'restaurants' })).toBe(false);
  });

  it('respects excludePaths', () => {
    const rules = { ...base, excludePaths: ['/contact'] };
    expect(matchesDisplayRules(rules, { pagePath: '/contact' })).toBe(false);
    expect(matchesDisplayRules(rules, { pagePath: '/contact/thanks' })).toBe(false);
    expect(matchesDisplayRules(rules, { pagePath: '/about' })).toBe(true);
  });

  it('filters by pageType and pagePath prefix', () => {
    const rules = {
      ...base,
      pageTypes: [PageType.INDUSTRY],
      pagePaths: ['/industries/healthcare'],
    };
    expect(
      matchesDisplayRules(rules, {
        pageType: PageType.INDUSTRY,
        pagePath: '/industries/healthcare',
      }),
    ).toBe(true);
    expect(
      matchesDisplayRules(rules, {
        pageType: PageType.HOME,
        pagePath: '/',
      }),
    ).toBe(false);
  });

  it('allows DeviceType.ALL or exact device match', () => {
    expect(
      matchesDisplayRules(
        { ...base, devices: [DeviceType.ALL] },
        { device: DeviceType.MOBILE },
      ),
    ).toBe(true);
    expect(
      matchesDisplayRules(
        { ...base, devices: [DeviceType.DESKTOP] },
        { device: DeviceType.MOBILE },
      ),
    ).toBe(false);
  });

  it('honors startAt / endAt windows', () => {
    const now = new Date('2026-07-12T12:00:00.000Z');
    const rules = {
      ...base,
      startAt: new Date('2026-07-01T00:00:00.000Z'),
      endAt: new Date('2026-07-31T00:00:00.000Z'),
    };
    expect(matchesDisplayRules(rules, { now })).toBe(true);
    expect(matchesDisplayRules(rules, { now: new Date('2026-08-01T00:00:00.000Z') })).toBe(false);
  });

  it('returns true for null/undefined rules', () => {
    expect(matchesDisplayRules(null, {})).toBe(true);
    expect(matchesDisplayRules(undefined, {})).toBe(true);
  });
});

describe('sortByPriorityDesc', () => {
  it('sorts by priority then displayRules.priority', () => {
    const sorted = sortByPriorityDesc([
      { priority: 1, title: 'a' },
      { displayRules: { ...defaultDisplayRules(), priority: 50 }, title: 'b' },
      { priority: 10, title: 'c' },
    ]);
    expect(sorted.map((i) => i.title)).toEqual(['b', 'c', 'a']);
  });
});
