import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  digitalCallPrice,
  digitalPutPrice,
  SECONDS_PER_YEAR,
} from './black-scholes';
import { MarketAccount, Side, ChartDataPoint } from './types';

// 默认市场配置
const DEFAULT_MARKET_CONFIG: MarketAccount = {
  bump: 0,
  epochDurationSecs: 300, // 5 分钟
  settleDelayEpochs: 1,
  feeBps: 100, // 1%
  minStake: 1,
  maxStake: 10000,
  callLambda: 0.999, // < 1.0
  putLambda: 1.001, // > 1.0
  vegaBuffer: 0.05,
  feedId: [],
  stalenessMaxSec: 60,
  lastPrice: 100,
  lastTs: Date.now(),
  sigma2: 0.25, // IV ≈ 50%
  halfLifeSecs: 43200, // 12 小时
  vault: '',
  pool: '',
  treasury: '',
  paused: false,
  positionCounter: 0,
};

export const PremiumSimulator: React.FC = () => {
  // 模式切换
  const [mode, setMode] = useState<'premium' | 'odds'>('premium');

  // 基础交易参数
  const [spotPrice, setSpotPrice] = useState<number>(100);
  const [barrierPrice, setBarrierPrice] = useState<number>(100);
  const [side, setSide] = useState<Side>(Side.Long);

  // Odds 模式参数
  const [odds, setOdds] = useState<number>(10);

  // 市场配置参数
  const [marketConfig, setMarketConfig] = useState<MarketAccount>(
    DEFAULT_MARKET_CONFIG
  );

  // 图表范围设置
  const [rangePercent, setRangePercent] = useState<number>(30); // ±30%
  const [dataPoints, setDataPoints] = useState<number>(50); // 50个数据点

  // 计算当前 Premium
  const currentPremium = useMemo(() => {
    return calcPremium(spotPrice, barrierPrice, side, marketConfig);
  }, [spotPrice, barrierPrice, side, marketConfig]);

  // 生成图表数据
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    const minSpot = barrierPrice * (1 - rangePercent / 100);
    const maxSpot = barrierPrice * (1 + rangePercent / 100);
    const step = (maxSpot - minSpot) / (dataPoints - 1);

    for (let i = 0; i < dataPoints; i++) {
      const spot = minSpot + step * i;
      const longPremium = calcPremium(spot, barrierPrice, Side.Long, marketConfig);
      const shortPremium = calcPremium(spot, barrierPrice, Side.Short, marketConfig);

      data.push({
        spotPrice: spot,
        longPremium,
        shortPremium,
      });
    }

    return data;
  }, [barrierPrice, marketConfig, rangePercent, dataPoints]);

  // 更新市场配置的辅助函数
  const updateMarketConfig = (key: keyof MarketAccount, value: any) => {
    setMarketConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Odds 模式：计算结果
  const oddsResult = useMemo(() => {
    if (mode !== 'odds') return null;
    
    const targetPremium = 1.0 / odds;
    const solvedBarrier = solveForBarrier(targetPremium, spotPrice, side, marketConfig);
    const percentChange = ((solvedBarrier / spotPrice) - 1) * 100;
    
    return {
      premium: targetPremium,
      barrier: solvedBarrier,
      percentChange,
    };
  }, [mode, odds, spotPrice, side, marketConfig]);

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#1a1a1a', marginBottom: '20px' }}>
        📊 期权计算器与可视化
      </h1>

      {/* Tab 切换 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px',
        marginBottom: '30px'
      }}>
        <button
          onClick={() => setMode('premium')}
          style={{
            ...tabButtonStyle,
            backgroundColor: mode === 'premium' ? '#4dabf7' : '#f1f3f5',
            color: mode === 'premium' ? '#fff' : '#495057',
            fontWeight: mode === 'premium' ? 600 : 400,
          }}
        >
          💰 Premium 模式
        </button>
        <button
          onClick={() => setMode('odds')}
          style={{
            ...tabButtonStyle,
            backgroundColor: mode === 'odds' ? '#4dabf7' : '#f1f3f5',
            color: mode === 'odds' ? '#fff' : '#495057',
            fontWeight: mode === 'odds' ? 600 : 400,
          }}
        >
          🎲 Odds 模式
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* 左侧：参数输入区 */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, fontSize: '18px', color: '#333' }}>⚙️ 参数设置</h2>

          {/* 基础参数 */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', color: '#555', borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
              基础参数
            </h3>
            
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                现货价格 (Spot Price)
              </label>
              <input
                type="number"
                value={spotPrice}
                onChange={(e) => setSpotPrice(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            {mode === 'premium' ? (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  障碍价格 (Barrier Price)
                </label>
                <input
                  type="number"
                  value={barrierPrice}
                  onChange={(e) => setBarrierPrice(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  赔率 (Odds)
                </label>
                <input
                  type="number"
                  value={odds}
                  onChange={(e) => setOdds(Number(e.target.value))}
                  style={inputStyle}
                  min="1.01"
                  step="0.1"
                />
                <small style={{ color: '#666' }}>例如：10 表示 10 倍赔率</small>
              </div>
            )}

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                方向 (Side)
              </label>
              <select
                value={side}
                onChange={(e) => setSide(Number(e.target.value) as Side)}
                style={inputStyle}
              >
                <option value={Side.Long}>Long (看涨)</option>
                <option value={Side.Short}>Short (看跌)</option>
              </select>
            </div>
          </div>

          {/* 高级参数 */}
          <div>
            <h3 style={{ fontSize: '16px', color: '#555', borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
              高级参数
            </h3>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                波动率² (Sigma²)
              </label>
              <input
                type="number"
                step="0.01"
                value={marketConfig.sigma2}
                onChange={(e) => updateMarketConfig('sigma2', Number(e.target.value))}
                style={inputStyle}
              />
              <small style={{ color: '#666' }}>IV ≈ {(Math.sqrt(marketConfig.sigma2) * 100).toFixed(1)}%</small>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                周期时长 (秒)
              </label>
              <input
                type="number"
                value={marketConfig.epochDurationSecs}
                onChange={(e) => updateMarketConfig('epochDurationSecs', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                结算延迟周期
              </label>
              <input
                type="number"
                value={marketConfig.settleDelayEpochs}
                onChange={(e) => updateMarketConfig('settleDelayEpochs', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Vega Buffer
              </label>
              <input
                type="number"
                step="0.01"
                value={marketConfig.vegaBuffer}
                onChange={(e) => updateMarketConfig('vegaBuffer', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Call Lambda (&lt; 1.0)
              </label>
              <input
                type="number"
                step="0.001"
                value={marketConfig.callLambda}
                onChange={(e) => updateMarketConfig('callLambda', Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Put Lambda (&gt; 1.0)
              </label>
              <input
                type="number"
                step="0.001"
                value={marketConfig.putLambda}
                onChange={(e) => updateMarketConfig('putLambda', Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* 图表设置 */}
          <div style={{ marginTop: '25px' }}>
            <h3 style={{ fontSize: '16px', color: '#555', borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
              图表设置
            </h3>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                价格范围 (±%)
              </label>
              <input
                type="number"
                value={rangePercent}
                onChange={(e) => setRangePercent(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                数据点数量
              </label>
              <input
                type="number"
                value={dataPoints}
                onChange={(e) => setDataPoints(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 右侧：结果与图表 */}
        <div>
          {mode === 'premium' ? (
            /* Premium 模式：显示 Premium */
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, fontSize: '18px', color: '#2e7d32' }}>💰 当前权利金 (Premium)</h2>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1b5e20', margin: '10px 0' }}>
                {currentPremium.toFixed(6)}
              </div>
              <div style={{ fontSize: '14px', color: '#555' }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>方向:</strong> {side === Side.Long ? 'Long (看涨)' : 'Short (看跌)'}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>现货价格:</strong> ${spotPrice.toFixed(2)}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>障碍价格:</strong> ${barrierPrice.toFixed(2)}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>隐含波动率:</strong> {(Math.sqrt(marketConfig.sigma2) * 100).toFixed(2)}%
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>到期时间:</strong> {(marketConfig.epochDurationSecs * marketConfig.settleDelayEpochs / 3600).toFixed(2)} 小时
                </p>
              </div>
            </div>
          ) : (
            /* Odds 模式：显示反推的 K 值 */
            <div style={{ 
              backgroundColor: '#fff3e0', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, fontSize: '18px', color: '#e65100' }}>🎲 根据 Odds 反推障碍价格</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>赔率 (Odds)</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef6c00' }}>
                    {odds.toFixed(2)}X
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>权利金 (Premium)</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef6c00' }}>
                    {oddsResult ? oddsResult.premium.toFixed(6) : '-'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffe0b2', borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>推荐障碍价格 (K)</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#bf360c' }}>
                  ${oddsResult ? oddsResult.barrier.toFixed(2) : '-'}
                </div>
                <div style={{ fontSize: '18px', color: '#d84315', marginTop: '8px' }}>
                  {oddsResult ? (
                    oddsResult.percentChange > 0 ? 
                      `需要上涨 ${oddsResult.percentChange.toFixed(2)}%` :
                      `需要下跌 ${Math.abs(oddsResult.percentChange).toFixed(2)}%`
                  ) : '-'}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#555', marginTop: '15px' }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>方向:</strong> {side === Side.Long ? 'Long (看涨)' : 'Short (看跌)'}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>当前现货:</strong> ${spotPrice.toFixed(2)}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>隐含波动率:</strong> {(Math.sqrt(marketConfig.sigma2) * 100).toFixed(2)}%
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>到期时间:</strong> {(marketConfig.epochDurationSecs * marketConfig.settleDelayEpochs / 3600).toFixed(2)} 小时
                </p>
              </div>
            </div>
          )}

          {/* 图表 */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '18px', color: '#333', marginBottom: '20px' }}>
              📈 权利金 vs 现货价格
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="spotPrice" 
                  label={{ value: '现货价格 (Spot Price)', position: 'insideBottom', offset: -5 }}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <YAxis 
                  label={{ value: '权利金 (Premium)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => value.toFixed(4)}
                />
                <Tooltip 
                  formatter={(value: number) => value.toFixed(6)}
                  labelFormatter={(label) => `现货价格: $${Number(label).toFixed(2)}`}
                />
                <Legend />
                <ReferenceLine 
                  x={barrierPrice} 
                  stroke="#ff6b6b" 
                  strokeDasharray="5 5" 
                  label={{ value: '障碍价格', position: 'top', fill: '#ff6b6b' }}
                />
                <ReferenceLine 
                  x={spotPrice} 
                  stroke="#4dabf7" 
                  strokeDasharray="3 3" 
                  label={{ value: '当前现货', position: 'top', fill: '#4dabf7' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="longPremium" 
                  stroke="#2ecc71" 
                  strokeWidth={2}
                  name="Long (看涨)" 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="shortPremium" 
                  stroke="#e74c3c" 
                  strokeWidth={2}
                  name="Short (看跌)" 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 说明文字 */}
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#fff3cd', 
            borderRadius: '8px',
            fontSize: '14px',
            color: '#856404'
          }}>
            <strong>💡 图表说明:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li><strong>绿色曲线</strong>: Long (看涨) 期权权利金，现货价格越高，价值越大</li>
              <li><strong>红色曲线</strong>: Short (看跌) 期权权利金，现货价格越低，价值越大</li>
              <li><strong>红色虚线</strong>: 障碍价格（执行价格）</li>
              <li><strong>蓝色虚线</strong>: 当前现货价格</li>
              <li>权利金代表期权的理论价格，基于 Black-Scholes 数字期权模型计算</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// 计算 Premium 的核心函数（从 index.ts 移植）
function calcPremium(
  s: number, 
  b: number, 
  side: Side, 
  marketAccount: MarketAccount
): number {
  const iv = Math.sqrt(Math.max(marketAccount.sigma2, 0));
  const timeYears =
    (marketAccount.epochDurationSecs * marketAccount.settleDelayEpochs) /
    SECONDS_PER_YEAR;

  if (side === Side.Long) {
    return digitalCallPrice(
      {
        spot: s,
        barrier: b,
        timeYears,
        vegaBuffer: marketAccount.vegaBuffer,
        volatility: iv,
      },
      marketAccount.callLambda
    );
  } else {
    return digitalPutPrice(
      {
        spot: s,
        barrier: b,
        timeYears,
        vegaBuffer: marketAccount.vegaBuffer,
        volatility: iv,
      },
      marketAccount.putLambda
    );
  }
}

// 二分法求解器：根据 Premium 反推 Barrier (K) 值
function solveForBarrier(
  targetPremium: number,
  spot: number,
  side: Side,
  marketConfig: MarketAccount,
  tolerance: number = 1e-6,
  maxIterations: number = 100
): number {
  // 设置搜索范围
  let kMin = side === Side.Long ? spot * 1.001 : spot * 0.01;
  let kMax = side === Side.Long ? spot * 3.0 : spot * 0.999;
  
  let iterations = 0;
  
  // 二分法迭代
  while (kMax - kMin > tolerance && iterations < maxIterations) {
    const kMid = (kMin + kMax) / 2;
    const premium = calcPremium(spot, kMid, side, marketConfig);
    
    if (side === Side.Long) {
      // Call: premium 随 K 增大而减小
      if (premium > targetPremium) {
        kMin = kMid;
      } else {
        kMax = kMid;
      }
    } else {
      // Put: premium 随 K 增大而增大（K 接近 S 时 premium 更大）
      if (premium > targetPremium) {
        kMax = kMid;
      } else {
        kMin = kMid;
      }
    }
    
    iterations++;
  }
  
  return (kMin + kMax) / 2;
}

// 输入框样式
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

// Tab 按钮样式
const tabButtonStyle: React.CSSProperties = {
  padding: '12px 30px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

