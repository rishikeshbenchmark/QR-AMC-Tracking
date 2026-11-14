import { describe, expect, it } from 'vitest';

import {
  allowedTransitionsFrom,
  ASSET_STATUS,
  ASSET_STATUSES,
  canTransition,
  isAssetStatus,
  isTerminal,
  requiresQcPassedHistory,
  TRANSITIONS,
} from '@/modules/assets/assets.lifecycle';

/**
 * The transition map carries business rules the HOD stated explicitly, so it is tested at birth
 * (CLAUDE.md). If one of these fails, either a rule changed — in which case the ADR changes too —
 * or someone widened the map by accident.
 */
describe('asset status vocabulary', () => {
  it('matches the ck_assets_status CHECK constraint exactly', () => {
    // Same order and membership as the hand-added constraint in the init migration.
    expect(ASSET_STATUSES).toEqual([
      'CREATED',
      'PURCHASED',
      'QC_PENDING',
      'QC_PASSED',
      'QC_FAILED',
      'ALLOCATED',
      'DISPATCHED',
      'INSTALLED',
      'WARRANTY_ACTIVE',
      'WARRANTY_EXPIRED',
      'AMC_ACTIVE',
      'AMC_EXPIRED',
      'DISCARDED',
    ]);
  });

  it('declares transitions for every status, so no lookup can be undefined', () => {
    for (const status of ASSET_STATUSES) {
      expect(TRANSITIONS[status]).toBeDefined();
    }
  });

  it('never allows a transition to a value outside the vocabulary', () => {
    for (const targets of Object.values(TRANSITIONS)) {
      for (const target of targets) {
        expect(isAssetStatus(target)).toBe(true);
      }
    }
  });

  it('rejects unknown strings', () => {
    expect(isAssetStatus('SOLD')).toBe(false);
    expect(isAssetStatus('created')).toBe(false);
  });
});

describe('canTransition — the documented happy path', () => {
  it('walks registration through to AMC expiry', () => {
    const path = [
      ASSET_STATUS.CREATED,
      ASSET_STATUS.PURCHASED,
      ASSET_STATUS.QC_PENDING,
      ASSET_STATUS.QC_PASSED,
      ASSET_STATUS.ALLOCATED,
      ASSET_STATUS.DISPATCHED,
      ASSET_STATUS.INSTALLED,
      ASSET_STATUS.WARRANTY_ACTIVE,
      ASSET_STATUS.WARRANTY_EXPIRED,
      ASSET_STATUS.AMC_ACTIVE,
      ASSET_STATUS.AMC_EXPIRED,
    ];
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransition(path[index]!, path[index + 1]!)).toBe(true);
    }
  });

  it('allows QC without waiting for Step-2 paperwork', () => {
    // Case 1 and Case 2 follow the same flow (HOD Q1.3) — PURCHASED is not a mandatory stop.
    expect(canTransition(ASSET_STATUS.CREATED, ASSET_STATUS.QC_PENDING)).toBe(true);
  });

  it('treats a renewal as a legal return to AMC_ACTIVE', () => {
    expect(canTransition(ASSET_STATUS.AMC_EXPIRED, ASSET_STATUS.AMC_ACTIVE)).toBe(true);
  });
});

describe('canTransition — illegal moves', () => {
  it('refuses to skip QC on the way to dispatch', () => {
    // HOD Q1.5: QC always precedes dispatch.
    expect(canTransition(ASSET_STATUS.CREATED, ASSET_STATUS.DISPATCHED)).toBe(false);
    expect(canTransition(ASSET_STATUS.PURCHASED, ASSET_STATUS.DISPATCHED)).toBe(false);
    expect(canTransition(ASSET_STATUS.QC_PENDING, ASSET_STATUS.DISPATCHED)).toBe(false);
  });

  it('makes QC_FAILED terminal apart from scrapping', () => {
    // HOD Q1.5: a QC-failed asset is scrapped.
    expect(allowedTransitionsFrom(ASSET_STATUS.QC_FAILED)).toEqual([ASSET_STATUS.DISCARDED]);
    expect(canTransition(ASSET_STATUS.QC_FAILED, ASSET_STATUS.QC_PENDING)).toBe(false);
    expect(canTransition(ASSET_STATUS.QC_FAILED, ASSET_STATUS.ALLOCATED)).toBe(false);
    expect(canTransition(ASSET_STATUS.QC_FAILED, ASSET_STATUS.INSTALLED)).toBe(false);
  });

  it('never leaves DISCARDED', () => {
    expect(isTerminal(ASSET_STATUS.DISCARDED)).toBe(true);
    for (const status of ASSET_STATUSES) {
      expect(canTransition(ASSET_STATUS.DISCARDED, status)).toBe(false);
    }
  });

  it('does not run the lifecycle backwards', () => {
    expect(canTransition(ASSET_STATUS.INSTALLED, ASSET_STATUS.DISPATCHED)).toBe(false);
    expect(canTransition(ASSET_STATUS.QC_PASSED, ASSET_STATUS.QC_PENDING)).toBe(false);
    expect(canTransition(ASSET_STATUS.WARRANTY_EXPIRED, ASSET_STATUS.WARRANTY_ACTIVE)).toBe(false);
  });

  it('treats a no-op as not a transition', () => {
    for (const status of ASSET_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe('DISCARDED reachability', () => {
  it('is reachable from every non-terminal status', () => {
    // HOD Q1.6: the end-of-life value is Discard; resale also discards the old asset.
    for (const status of ASSET_STATUSES) {
      if (status === ASSET_STATUS.DISCARDED) continue;
      expect(canTransition(status, ASSET_STATUS.DISCARDED)).toBe(true);
    }
  });
});

describe('requiresQcPassedHistory', () => {
  it('gates DISPATCHED and nothing else', () => {
    expect(requiresQcPassedHistory(ASSET_STATUS.DISPATCHED)).toBe(true);
    for (const status of ASSET_STATUSES) {
      if (status === ASSET_STATUS.DISPATCHED) continue;
      expect(requiresQcPassedHistory(status)).toBe(false);
    }
  });
});
