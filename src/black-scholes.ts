/**
 * Black-Scholes European Options Pricing with Digital Options
 *
 * References:
 * - Abramowitz & Stegun (1964): Handbook of Mathematical Functions, Section 7.1.26
 * - C. Hastings: Approximations for Digital Computers (1955)
 * - Black-Scholes (1973): Pricing of Options and Corporate Liabilities
 */

// ============================================================================
// NORMAL DISTRIBUTION (CDF)
// ============================================================================

export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;

/**
 * Cumulative Distribution Function (CDF) of Standard Normal Distribution
 *
 * Uses Abramowitz & Stegun approximation with Hastings coefficients
 * Accuracy: |error| < 1.5×10⁻⁷ for all x
 *
 * Formula: Φ(x) ≈ 1 - φ(x) · [a₁t + a₂t² + a₃t³ + a₄t⁴ + a₅t⁵]
 * where:
 *   φ(x) = (1/√(2π)) · e^(-x²/2)  [probability density function]
 *   t = 1 / (1 + p·|x|)
 *
 * @param x - Input value
 * @returns Φ(x) - Probability that standard normal ≤ x
 */
function normalCDF(x: number): number {
  // Hastings coefficients (better accuracy than standard A&S)
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const p = 0.2316419;

  // Coefficient for normal PDF: 1/√(2π)
  const pdfCoefficient = 0.3989422804014327;

  // Handle symmetry: Φ(-x) = 1 - Φ(x)
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x);

  // Compute t = 1/(1 + p|x|)
  const t = 1.0 / (1.0 + p * z);

  // Polynomial: a₁t + a₂t² + a₃t³ + a₄t⁴ + a₅t⁵
  // Using Horner's method for numerical stability
  const polynomial = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;

  // Normal PDF at x: φ(x) = (1/√(2π)) · e^(-x²/2)
  const pdf = pdfCoefficient * Math.exp(-0.5 * z * z);

  // CDF approximation
  const cdf = 1.0 - pdf * polynomial;

  // Apply symmetry correction for negative x
  return sign === 1 ? cdf : 1.0 - cdf;
}

// ============================================================================
// BLACK-SCHOLES VANILLA OPTIONS
// ============================================================================

interface BSParams {
  spot: number; // Current spot price (S)
  strike: number; // Strike price (K)
  volatility: number; // Implied volatility σ (annualized)
  timeYears: number; // Time to expiration in years
}

/**
 * Black-Scholes European Call Option Price
 *
 * Assumes: r ≈ 0 (zero risk-free rate) and q = 0 (no dividends)
 *
 * Formula:
 *   C = S·Φ(d₁) - K·Φ(d₂)
 * where:
 *   d₁ = [ln(S/K) + ½σ²T] / (σ√T)
 *   d₂ = d₁ - σ√T
 *
 * @param params - BSParams object with spot, strike, volatility, timeYears
 * @returns Call option price
 */
function blackScholesCall(params: BSParams): number {
  const { spot, strike, volatility, timeYears } = params;

  // Intrinsic value (lower bound for option price)
  if (volatility <= 0 || timeYears <= 0) {
    return Math.max(spot - strike, 0);
  }

  const sqrtT = Math.sqrt(timeYears);
  const sigmaT = volatility * sqrtT;

  // d₁ = [ln(S/K) + ½σ²T] / (σ√T)
  const d1 = (Math.log(spot / strike) + 0.5 * sigmaT * sigmaT) / sigmaT;

  // d₂ = d₁ - σ√T
  const d2 = d1 - sigmaT;

  // C = S·Φ(d₁) - K·Φ(d₂)
  return spot * normalCDF(d1) - strike * normalCDF(d2);
}

/**
 * Black-Scholes European Put Option Price
 *
 * Uses put-call parity: P = C - S + K (when r=0)
 * Or directly: P = K·Φ(-d₂) - S·Φ(-d₁)
 *
 * @param params - BSParams object with spot, strike, volatility, timeYears
 * @returns Put option price
 */
function blackSchoelesPut(params: BSParams): number {
  const { spot, strike, volatility, timeYears } = params;

  // Intrinsic value (lower bound for option price)
  if (volatility <= 0 || timeYears <= 0) {
    return Math.max(strike - spot, 0);
  }

  const sqrtT = Math.sqrt(timeYears);
  const sigmaT = volatility * sqrtT;

  // d₁ = [ln(S/K) + ½σ²T] / (σ√T)
  const d1 = (Math.log(spot / strike) + 0.5 * sigmaT * sigmaT) / sigmaT;

  // d₂ = d₁ - σ√T
  const d2 = d1 - sigmaT;

  // P = K·Φ(-d₂) - S·Φ(-d₁)
  // Using: Φ(-x) = 1 - Φ(x)
  return strike * (1.0 - normalCDF(d2)) - spot * (1.0 - normalCDF(d1));
}

// ============================================================================
// DIGITAL OPTIONS (BINARY OPTIONS)
// ============================================================================

interface DigitalParams {
  spot: number;
  barrier: number; // Barrier/Strike level (B)
  volatility: number; // Implied volatility
  vegaBuffer: number; // IV buffer for spread pricing
  timeYears: number;
}

/**
 * Digital Call Option Price
 *
 * Pricing model: Normalized call spread approximation
 *
 * Represents the probability of spot price finishing above the barrier
 * (Cash-or-Nothing Call) under the Black–Scholes framework.
 *
 * Construction:
 * - Lower strike (tight strike): B·λ  →  higher IV (σ + buffer)
 * - Upper strike (loose strike): B     →  lower IV (σ - buffer)
 *
 * Convention: callLambda < 1 (e.g. 0.999)
 *
 * Formula (finite-difference form):
 *   Digital_Call ≈ [ C(S, K₁, σ₁, T) - C(S, K₂, σ₂, T) ] / (K₂ - K₁)
 * where:
 *   K₁ = B·λ      (lower/tighter strike)
 *   K₂ = B         (upper/looser strike)
 *   σ₁ = σ + vegaBuffer
 *   σ₂ = σ - vegaBuffer
 *
 * Interpretation:
 * - This expression approximates ∂C/∂K ≈ -Φ(d₂) when the spread is narrow.
 * - Returned value is in [0,1], interpretable as the digital (probability) price.
 *
 * @param params - DigitalParams object
 * @param callLambda - Strike multiplier (<1)
 * @returns Digital call probability (normalized)
 */
export function digitalCallPrice(
  params: DigitalParams,
  callLambda: number
): number {
  if (callLambda >= 1.0) {
    throw new Error("callLambda must be < 1.0");
  }

  const { spot, barrier, volatility, vegaBuffer, timeYears } = params;

  const K1 = barrier * callLambda; // lower (tighter)
  const K2 = barrier; // upper (looser)
  const width = K2 - K1;

  // tighter -> higher IV ; looser -> lower IV
  const sigmaTight = Math.max(volatility + vegaBuffer, 1e-9);
  const sigmaLoose = Math.max(volatility - vegaBuffer, 1e-9);

  const C1 = blackScholesCall({
    spot,
    strike: K1,
    volatility: sigmaTight,
    timeYears,
  });
  const C2 = blackScholesCall({
    spot,
    strike: K2,
    volatility: sigmaLoose,
    timeYears,
  });

  return Math.max((C1 - C2) / width, 0);
}

/**
 * Digital Put Option Price
 *
 * Pricing model: Normalized put spread approximation
 *
 * Represents the probability of spot price finishing below the barrier
 * (Cash-or-Nothing Put) under the Black–Scholes framework.
 *
 * Construction:
 * - Lower strike (loose strike): B     →  lower IV (σ - buffer)
 * - Upper strike (tight strike): B·λ   →  higher IV (σ + buffer)
 *
 * Convention: putLambda > 1 (e.g. 1.001)
 *
 * Formula (finite-difference form):
 *   Digital_Put ≈ [ P(S, K₂, σ₂, T) - P(S, K₁, σ₁, T) ] / (K₂ - K₁)
 * where:
 *   K₁ = B         (lower/looser strike)
 *   K₂ = B·λ       (upper/tighter strike)
 *   σ₁ = σ - vegaBuffer
 *   σ₂ = σ + vegaBuffer
 *
 * Interpretation:
 * - This expression approximates ∂P/∂K ≈ Φ(-d₂) when the spread is narrow.
 * - Returned value is in [0,1], interpretable as the digital (probability) price.
 *
 * @param params - DigitalParams object
 * @param putLambda - Strike multiplier (>1)
 * @returns Digital put probability (normalized)
 */
export function digitalPutPrice(
  params: DigitalParams,
  putLambda: number
): number {
  if (putLambda <= 1.0) {
    throw new Error("putLambda must be > 1.0");
  }

  const { spot, barrier, volatility, vegaBuffer, timeYears } = params;

  const K1 = barrier; // lower (looser)
  const K2 = barrier * putLambda; // upper (tighter)
  const width = K2 - K1;

  // tighter (upper) -> higher IV ; looser (lower) -> lower IV
  const sigmaTight = Math.max(volatility + vegaBuffer, 1e-9);
  const sigmaLoose = Math.max(volatility - vegaBuffer, 1e-9);

  const P1 = blackSchoelesPut({
    spot,
    strike: K1,
    volatility: sigmaLoose,
    timeYears,
  });
  const P2 = blackSchoelesPut({
    spot,
    strike: K2,
    volatility: sigmaTight,
    timeYears,
  });

  return Math.max((P2 - P1) / width, 0);
}

// ============================================================================
// PAYOUT MODELS
// ============================================================================

/**
 * Method A: Cash-or-Nothing Payout
 *
 * Winner receives fixed stake amount
 * Loser receives $0
 *
 * @param stake - Wager amount
 * @param won - Did the position win?
 * @returns Payout amount
 */
export function payoutCashOrNothing(stake: number, won: boolean): number {
  return won ? stake : 0;
}

/**
 * Method B: Odds-Based Payout
 *
 * Winner receives: stake / digital_price
 * Higher price = lower odds = higher payout (riskier)
 * Lower price = higher odds = lower payout (safer)
 *
 * @param stake - Wager amount
 * @param digitalPrice - Price of digital option
 * @param won - Did the position win?
 * @returns Payout amount
 */
export function payoutOddsBased(
  stake: number,
  digitalPrice: number,
  won: boolean
): number {
  if (!won) return 0;
  return stake / Math.max(digitalPrice, 1e-12);
}

/**
 * Premium (Cost to Enter)
 *
 * @param stake - Wager amount
 * @param digitalPrice - Price of digital option
 * @returns Total premium to be paid
 */
export function calculatePremium(stake: number, digitalPrice: number): number {
  return stake * digitalPrice;
}

