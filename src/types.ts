/**
 * Market Account Structure
 */
export interface MarketAccount {
  bump: number;
  epochDurationSecs: number;
  settleDelayEpochs: number;
  feeBps: number;
  minStake: number;
  maxStake: number;
  callLambda: number;
  putLambda: number;
  vegaBuffer: number;
  feedId: number[];
  stalenessMaxSec: number;
  lastPrice: number;
  lastTs: number;
  sigma2: number;
  halfLifeSecs: number;
  vault: string;
  pool: string;
  treasury: string;
  paused: boolean;
  positionCounter: number;
}

/**
 * Side Enum
 */
export enum Side {
  Long = 0,
  Short = 1,
}

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  spotPrice: number;
  longPremium: number;
  shortPremium: number;
}

