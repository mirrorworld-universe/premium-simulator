# 📊 期权权利金计算器与可视化工具

基于 Black-Scholes 模型的数字期权权利金计算器，提供交互式可视化界面。

## ✨ 功能特性

- 🧮 **实时计算**: 根据输入参数实时计算期权权利金
- 📈 **可视化图表**: 展示权利金随现货价格变化的曲线
- ⚙️ **参数可调**: 支持调整所有 Black-Scholes 模型参数
- 🎯 **双向对比**: 同时显示 Long 和 Short 期权的权利金曲线
- 💡 **直观展示**: 标注当前现货价格和障碍价格位置

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产版本

```bash
npm run preview
```

## 📖 使用说明

### 基础参数

- **现货价格 (Spot Price)**: 当前标的资产的市场价格
- **障碍价格 (Barrier Price)**: 期权的执行价格/障碍价格
- **方向 (Side)**: 
  - Long (看涨): 价格上涨时获利
  - Short (看跌): 价格下跌时获利

### 高级参数

- **波动率² (Sigma²)**: 市场波动率的平方，影响期权价值
- **周期时长**: 每个交易周期的时长（秒）
- **结算延迟周期**: 从开仓到结算的周期数
- **Vega Buffer**: 价差定价的波动率缓冲
- **Call Lambda**: Call 期权的价差参数（必须 < 1.0）
- **Put Lambda**: Put 期权的价差参数（必须 > 1.0）

### 图表设置

- **价格范围 (±%)**: 控制图表显示的现货价格范围
- **数据点数量**: 控制图表曲线的平滑度

## 📊 图表说明

- **绿色曲线**: Long (看涨) 期权的权利金
- **红色曲线**: Short (看跌) 期权的权利金
- **红色虚线**: 障碍价格（执行价格）
- **蓝色虚线**: 当前现货价格

## 🔬 技术栈

- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Recharts**: 图表库
- **Vite**: 构建工具
- **Black-Scholes Model**: 期权定价模型

## 📚 核心算法

项目使用 Black-Scholes 模型计算数字期权价格：

- **Digital Call**: 通过 call spread 近似计算
- **Digital Put**: 通过 put spread 近似计算
- **正态分布**: 使用 Abramowitz & Stegun 近似算法

详见 `src/black-scholes.ts` 源码。

## 📝 默认配置

```typescript
{
  epochDurationSecs: 300,      // 5 分钟
  settleDelayEpochs: 1,        // 1 个周期
  sigma2: 0.25,                // IV ≈ 50%
  vegaBuffer: 0.05,            // 5% 波动率缓冲
  callLambda: 0.999,           // < 1.0
  putLambda: 1.001,            // > 1.0
}
```

## 🎯 应用场景

- 期权交易策略分析
- Black-Scholes 模型学习与验证
- 数字期权定价研究
- 风险管理与对冲策略

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

