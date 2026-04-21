# Ski Coach MVP - 完整技术教程

## 项目概览

这是一个**React Native (Expo)** 移动应用，用于滑雪技术分析。核心功能：
- 接收鞋垫压力传感器数据（5个传感器）
- 实时分析滑雪姿态和技术问题
- 提供语音指导
- 运动后AI分析总结

---

## 技术栈

| 技术 | 用途 |
|------|------|
| React Native 0.81 + Expo 54 | 跨平台移动开发框架 |
| TypeScript | 类型安全的前端开发 |
| Zustand | 轻量级全局状态管理（类似Python的dict） |
| react-native-svg | 绘制脚压可视化图形 |
| expo-speech | 文字转语音（语音教练） |
| React Navigation 7 | 页面路由和导航 |

**Python对比理解：**

| Python/Flask | React Native | 说明 |
|---|---|---|
| Flask App | App.tsx | 入口文件 |
| 路由 @app.route | Navigation | 页面跳转 |
| 数据库 Model | types/index.ts | 数据结构 |
| 业务逻辑函数 | utils/*.ts | 算法函数 |
| Jinja2模板 | React组件 | 页面UI |

---

## 目录结构解析

```
ski-coach-mvp/
├── App.tsx                    # 入口：导航 + 语言Provider
├── src/
│   ├── screens/               # 3个页面
│   │   ├── HomeScreen.tsx     # 首页：连接设备/开始/历史
│   │   ├── ActiveRunScreen.tsx  # 滑雪中：实时数据
│   │   └── RunReviewScreen.tsx   # 回顾：得分+AI总结
│   │
│   ├── components/            # UI组件
│   │   └── PressureViz.tsx   # 脚压可视化（两个脚的图形）
│   │
│   ├── hooks/                 # 自定义Hooks（类似Python装饰器）
│   │   ├── useSensor.ts       # 传感器数据流
│   │   └── useCoach.ts        # 语音教练逻辑
│   │
│   ├── store/                 # Zustand状态仓库
│   │   └── index.ts          # 全局状态（类似Flask的g对象）
│   │
│   ├── types/                 # TypeScript类型定义
│   │   └── index.ts
│   │
│   └── utils/                 # 核心算法（纯函数）
│       ├── signalProcessor.ts # 传感器信号处理
│       ├── diagnostics.ts     # 问题检测
│       ├── stateMachine.ts    # 姿态状态机
│       ├── scoring.ts         # 评分算法
│       ├── llmSummary.ts      # LLM接口 ← 重要
│       ├── voiceCoach.ts      # 语音控制
│       ├── bleManager.ts      # 蓝牙连接
│       └── simulator.ts       # 模拟器（开发用）
```

---

## 模块依赖关系图

```
                    ┌─────────────────────────────┐
                    │         App.tsx              │
                    │   (Navigation + Provider)    │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌───────────┐   ┌──────────────┐
        │HomeScreen│    │ActiveRun  │   │RunReview     │
        └─────┬────┘    │  Screen   │   │  Screen      │
              │         └─────┬─────┘   └──────┬───────┘
              │               │                │
              │     ┌─────────┴────────┐       │
              │     │   PressureViz    │       │
              │     └──────────────────┘       │
              │               │                │
              ├───────────────┼────────────────┤
              ▼               ▼                ▼
        ┌─────────────────────────────────────────┐
        │              useSensor Hook              │
        │   (传感器数据 + 连接状态)                  │
        └──────────────────┬──────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌──────────┐    ┌────────────┐    ┌──────────┐
    │bleManager │    │ simulator  │    │   Store  │
    │ (蓝牙)    │    │ (模拟器)    │    │ (Zustand)│
    └──────────┘    └────────────┘    └──────────┘
                           │                │
                           └───────┬────────┘
                                   ▼
                         ┌────────────────────┐
                         │  signalProcessor   │ ← 标准化数据
                         └─────────┬──────────┘
                                   ▼
                         ┌────────────────────┐
                         │   diagnostics.ts   │ ← 问题检测
                         └─────────┬──────────┘
                                   ▼
                         ┌────────────────────┐
                         │    scoring.ts      │ ← 计算得分
                         └─────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌─────────────────┐          ┌─────────────────┐
          │   useCoach.ts   │          │   llmSummary.ts │ ← AI总结接口
          │  (语音教练)      │          │  (模型访问)      │
          └─────────────────┘          └─────────────────┘
```

---

## 核心原则：高内聚、低耦合

```
好的设计：                          问题设计：
┌─────────────┐                    ┌─────────────┐
│ diagnostics │ ← 只做问题检测     │  Screen.ts  │
│   (纯函数)   │   不关心UI怎么显示  │   (500行)   │
└─────────────┘                    │  - UI代码   │
                                   │  - 业务逻辑  │
                                   │  - API调用   │
                                   │  - BLE连接   │
                                   └─────────────┘
```

**本项目的拆分原则：**
- `utils/*.ts` = 纯算法函数，无副作用（类似Python的utility函数）
- `hooks/*.ts` = 业务逻辑组合（类似Python的Service层）
- `screens/*.tsx` = UI展示（只关心怎么显示）
- `types/index.ts` = 类型定义（类似Python的dataclass）

---

## 5个传感器详解

### 传感器物理布局

```
        左脚                    右脚
    ┌─────────────┐        ┌─────────────┐
    │ [前左]  ●   │        │   ● [前右]  │  ← frontLeft, frontRight
    │             │        │             │
    │    [中] ●   │        │   ● [中]    │  ← middle (左右脚共用)
    │             │        │             │
    │ [后左] ●   │        │   ● [后右]  │  ← rearLeft, rearRight
    └─────────────┘        └─────────────┘
```

### 类型定义 (types/index.ts)

```typescript
// 5个传感器的数据
export interface PressureData {
  frontLeft: number;   // 前左传感器
  frontRight: number;  // 前右传感器
  middle: number;      // 中间传感器
  rearLeft: number;     // 后左传感器
  rearRight: number;    // 后右传感器
  // 数值范围: 0-100 (百分比)
}
```

### 前端可视化 (PressureViz.tsx)

**5个传感器在脚图上的位置：**

```typescript
// 左脚用3个传感器
const leftSensors = [
  { key: 'frontLeft', data: pressure.frontLeft, ... },
  { key: 'middle', data: pressure.middle, ... },
  { key: 'rearLeft', data: pressure.rearLeft, ... },
];

// 右脚用3个传感器
const rightSensors = [
  { key: 'frontRight', data: pressure.frontRight, ... },
  { key: 'middle', data: pressure.middle, ... },  // 中间共用
  { key: 'rearRight', data: pressure.rearRight, ... },
];
```

### 信号处理 (signalProcessor.ts)

**计算压力中心点 (COP)：**

```typescript
function calculateCenterOfPressure(p: PressureData): CenterOfPressure {
  // 每个传感器的权重位置
  const SENSOR_X = {
    frontLeft: 0.2, frontRight: 0.8,
    middle: 0.5, rearLeft: 0.2, rearRight: 0.8
  };
  const SENSOR_Y = {
    frontLeft: 0.25, frontRight: 0.25,
    middle: 0.5, rearLeft: 0.75, rearRight: 0.75
  };

  const total = sum(Object.values(p));
  return {
    x: weightedAverage(p, SENSOR_X) / total,  // 0=左, 1=右
    y: weightedAverage(p, SENSOR_Y) / total,  // 0=前, 1=后
  };
}
```

**Python对比：**

```python
# 等价的Python代码
def calculate_cop(pressure: dict) -> tuple:
    weights_x = {'frontLeft': 0.2, 'frontRight': 0.8, ...}
    weights_y = {'frontLeft': 0.25, 'frontRight': 0.25, ...}

    total = sum(pressure.values())
    x = sum(pressure[k] * weights_x[k] for k in pressure) / total
    y = sum(pressure[k] * weights_y[k] for k in pressure) / total
    return x, y
```

### 问题检测 (diagnostics.ts)

6种问题检测**全部依赖5个传感器的数据：**

```typescript
function detectBackSeat(p: PressureData): SkiIssue | null {
  const rear = p.rearLeft + p.rearRight;       // ← 使用后2个传感器
  const front = p.frontLeft + p.frontRight + p.middle;  // ← 使用前3个传感器
  if (rear / (rear + front) > 0.6) { ... }
}

function detectWeightImbalance(p: PressureData): SkiIssue | null {
  const left = p.frontLeft + p.middle + p.rearLeft;    // ← 左侧3个传感器
  const right = p.frontRight + p.middle + p.rearRight; // ← 右侧3个传感器
  if (Math.max(left, right) / Math.min(left, right) > 1.4) { ... }
}
```

---

## LLM模型接口

### 接口设计 (llmSummary.ts)

提供了**干净的双函数接口：**

```typescript
// 1. 数据准备：把原始运动数据整理成LLM需要的格式
export function prepareSummaryData(run: RunResult): TripSummaryRequest {
  // 聚合问题、计算carving比例、找出改进点
  return { runId, score, carvingRatio, skiddingRatio, balanceScore, ... };
}

// 2. LLM调用：发送请求，获取AI总结
export async function summarizeRunWithLLM(
  data: TripSummaryRequest
): Promise<LLMSummaryResult> {
  // ⚠️ 当前是MOCK实现，1.5秒延迟模拟
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 返回格式：
  return {
    runId: string,
    summary: string,        // "得分85/100，优秀..."
    generatedAt: number,
    keyInsights: string[],  // ["卡宾比例75%", "注意左右平衡"]
  };
}
```

### 使用位置 (RunReviewScreen.tsx)

```typescript
const handleGetAISummary = useCallback(async () => {
  // 准备数据
  const summaryData = prepareSummaryData(run);

  // 调用LLM（当前是mock）
  const result = await summarizeRunWithLLM(summaryData);

  setLlmSummary(result);
}, [run]);
```

### 如何接入真实LLM

**只需要修改 `summarizeRunWithLLM` 一个函数：**

```typescript
// llmSummary.ts

export async function summarizeRunWithLLM(
  data: TripSummaryRequest
): Promise<LLMSummaryResult> {
  // ========== 替换这里 ==========

  // 方案1: OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `分析这次滑雪：得分${data.score}，carving比例${data.skillAssessment.carvingRatio}...`
      }]
    })
  });
  const json = await response.json();
  const summary = json.choices[0].message.content;

  // ========== 替换结束 ==========

  return { summary, keyInsights: [...], generatedAt: Date.now() };
}
```

---

## 状态管理 (Zustand)

类似Python的全局变量，但有持久化：

```typescript
// store/index.ts
const useStore = create<State>()(
  persist(
    (set, get) => ({
      // 状态
      currentRun: null,
      pastRuns: [],        // ← AsyncStorage持久化
      language: 'en',      // ← AsyncStorage持久化

      // 方法
      saveRun: (run: RunResult) => {
        set(state => ({
          pastRuns: [run, ...state.pastRuns].slice(0, 50) // 最多50条
        }));
      },
    }),
    {
      name: 'ski-coach-storage',  // localStorage key
    }
  )
);

// 使用 (类似Python的 @app.before_request)
function HomeScreen() {
  const pastRuns = useStore(state => state.pastRuns);  // ← 订阅
  const saveRun = useStore(state => state.saveRun);    // ← 调用
}
```

---

## 事件流图

```
用户点击"开始滑雪"
        │
        ▼
┌───────────────────┐
│   HomeScreen      │
│   navigate()      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ ActiveRunScreen   │ ◄────────────────┐
│ (useEffect)       │                 │
└─────────┬─────────┘                 │
          │                           │
          ▼                           │
┌───────────────────┐                 │
│   useSensor()     │                 │
│   20Hz更新        │                 │
└─────────┬─────────┘                 │
          │                           │
    ┌─────┴─────┐                      │
    ▼           ▼                      │
┌────────┐  ┌────────────┐             │
│模拟器/ │  │ signal     │             │
│BLE设备 │──► processor  │             │
└────────┘  └─────┬──────┘             │
                  │                     │
          ┌───────┴───────┐             │
          ▼               ▼             │
    ┌──────────┐    ┌────────────┐        │
    │diagnostics│    │ PressureViz│      │
    │问题检测   │    │  20Hz渲染   │      │
    └─────┬────┘    └────────────┘        │
          │                               │
          ▼                               │
    ┌──────────┐                          │
    │ useCoach │                          │
    │ 语音播报 │                          │
    └─────┬────┘                          │
          │                               │
          ▼                               │
┌───────────────────┐                     │
│ 点击"结束滑雪"    │                     │
└─────────┬─────────┘                     │
          │                               │
          ▼                               │
┌───────────────────┐                     │
│ scoring.ts        │                     │
│ 计算得分          │                     │
└─────────┬─────────┘                     │
          │                               │
          ▼                               │
┌───────────────────┐                     │
│ RunReviewScreen   │ ◄──────────────────┘
│ 显示得分          │
│ 用户点击"AI总结"  │
          │
          ▼
┌───────────────────┐
│ prepareSummaryData│
│ 整理数据          │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ summarizeRunWithLLM│
│ ⚠️ 当前MOCK       │
│ 可替换为真实API   │
└───────────────────┘
```

---

## 核心文件速查表

| 文件 | 职责 | 类比Python |
|---|---|---|
| `types/index.ts` | 数据结构定义 | dataclass |
| `utils/signalProcessor.ts` | 信号处理算法 | numpy/pandas |
| `utils/diagnostics.ts` | 问题检测算法 | sklearn规则引擎 |
| `utils/scoring.ts` | 评分算法 | 评分函数 |
| `utils/llmSummary.ts` | **LLM接口** | API调用层 |
| `utils/voiceCoach.ts` | 语音播报 | 播放器 |
| `utils/simulator.ts` | 开发用模拟器 | mock数据 |
| `utils/bleManager.ts` | 蓝牙连接 | 串口通信 |
| `hooks/useSensor.ts` | 传感器数据流 | 数据获取层 |
| `hooks/useCoach.ts` | 教练业务逻辑 | Service层 |
| `store/index.ts` | 全局状态 | Flask的g/Redis |

---

## 接口检查清单

### ✅ 5个传感器集成

| 检查项 | 位置 | 状态 |
|---|---|---|
| 类型定义5个字段 | `types/index.ts:10-16` | ✅ |
| 前端可视化渲染 | `PressureViz.tsx:61-71` | ✅ |
| 信号处理全部5个 | `signalProcessor.ts` | ✅ |
| 问题检测全部使用 | `diagnostics.ts` | ✅ |
| 模拟器生成5个数据 | `simulator.ts` | ✅ |

### ✅ LLM模型访问接口

| 检查项 | 位置 | 状态 |
|---|---|---|
| `summarizeRunWithLLM` 函数存在 | `llmSummary.ts:108` | ✅ |
| `TripSummaryRequest` 类型定义 | `types/index.ts:81-108` | ✅ |
| `LLMSummaryResult` 类型定义 | `types/index.ts:111-116` | ✅ |
| 页面调用保留接口 | `RunReviewScreen.tsx:160-161` | ✅ |
| **接口可替换为真实LLM** | 只需改一个函数 | ✅ |

**当前LLM是Mock实现**（llmSummary.ts:112有1.5秒模拟延迟），但接口设计干净，**接入真实模型只需要替换 `summarizeRunWithLLM` 函数体**。

---

## 数据流详解（从前端到AI）

### 第一步：传感器层

**Python风格的理解：**

```python
# Python: 从设备读取原始数据
raw_data = sensor.read()  # [255, 200, 150, 100, 80]

# TypeScript: 从BLE接收原始数据
// bleManager.ts 解析5字节
const raw = [0xFF, 0xC8, 0x96, 0x64, 0x50] // hex格式
```

### 第二步：信号处理

```typescript
// signalProcessor.ts - 类似Python的信号处理函数

// 1. 归一化：0-255 → 0-100
function normalize(raw: number[]): PressureData {
  return {
    frontLeft: raw[0] / 255 * 100,   // 255→100, 0→0
    frontRight: raw[1] / 255 * 100,
    middle: raw[2] / 255 * 100,
    rearLeft: raw[3] / 255 * 100,
    rearRight: raw[4] / 255 * 100,
  };
}

// 2. 低通滤波：去除抖动（类似pandas的ewm）
function applyLowPassFilter(newVal: number, prev: number, alpha = 0.3): number {
  return alpha * newVal + (1 - alpha) * prev;  // EMA
}

// 3. 完整管道
function buildSensorFrame(raw: number[]): SensorFrame {
  const normalized = normalize(raw);
  const filtered = applyLowPassFilter(normalized, prev);
  const cop = calculateCenterOfPressure(filtered);
  const turn = detectTurnDirection(filtered, prev);

  return { pressure: filtered, cop, turn, timestamp: Date.now() };
}
```

**Python对比：**

```python
# 相当于Python这样写：
import pandas as pd

def process_sensor_data(raw_df):
    # 归一化
    df = raw_df / 255 * 100

    # EMA平滑
    df['smoothed'] = df['pressure'].ewm(alpha=0.3).mean()

    # 计算重心
    weights_x = [0.2, 0.8, 0.5, 0.2, 0.8]
    df['cop_x'] = (df * weights_x).sum(axis=1) / df.sum(axis=1)

    return df
```

### 第三步：问题检测

```typescript
// diagnostics.ts - 检测6种常见滑雪问题

// 1. 后坐检测：后脚压力太大
function detectBackSeat(p: PressureData): SkiIssue | null {
  const rear = p.rearLeft + p.rearRight;
  const front = p.frontLeft + p.frontRight + p.middle;
  const rearFraction = rear / (rear + front + 0.001);

  if (rearFraction > 0.6) {
    return {
      type: 'back_seat',
      severity: rearFraction > 0.75 ? 'high' : 'medium',
      tip: 'Shift your weight forward. Flex your ankles!',
    };
  }
  return null;
}

// 2. 前压检测：前脚压力太大
function detectForwardPressure(p: PressureData): SkiIssue | null {
  const front = p.frontLeft + p.frontRight + p.middle;
  const rear = p.rearLeft + p.rearRight;
  const frontFraction = front / (front + rear + 0.001);

  if (frontFraction > 0.6) {
    return {
      type: 'forward_pressure',
      severity: 'medium',
      tip: 'Release pressure from your shins. Sit back slightly.',
    };
  }
  return null;
}

// 3. 左右不平衡检测
function detectWeightImbalance(p: PressureData): SkiIssue | null {
  const left = p.frontLeft + p.middle + p.rearLeft;
  const right = p.frontRight + p.middle + p.rearRight;
  const ratio = Math.max(left, right) / (Math.min(left, right) + 0.001);

  if (ratio > 1.4) {
    return {
      type: 'weight_imbalance',
      severity: ratio > 2.0 ? 'high' : 'medium',
      tip: 'Balance your weight evenly between both legs.',
    };
  }
  return null;
}

// 运行所有检测器
function detectAllIssues(p: PressureData): SkiIssue[] {
  return [
    detectBackSeat(p),
    detectForwardPressure(p),
    detectWeightImbalance(p),
    detectUpperBodyRotation(p),
    detectPoorAngulation(p),
    detectSkidding(p),
  ].filter(Boolean);
}
```

**Python对比：**

```python
# Python中等价的检测逻辑
def detect_issues(pressure: dict) -> list:
    issues = []

    rear = pressure['rear_left'] + pressure['rear_right']
    front = pressure['front_left'] + pressure['front_right'] + pressure['middle']

    if rear / (rear + front) > 0.6:
        issues.append({'type': 'back_seat', 'severity': 'high'})

    return issues
```

### 第四步：评分

```typescript
// scoring.ts - 计算运动得分

function calculateRunScore(issues: SkiIssue[]): number {
  // 扣分规则
  const penalties = { low: 3, medium: 7, high: 12 };

  // 统计每种问题的总扣分
  const totalPenalty = issues.reduce((sum, issue) => {
    return sum + penalties[issue.severity] * issue.frequency;
  }, 0);

  // 100分制
  return Math.max(0, 100 - totalPenalty);
}

function findDominantIssue(issues: SkiIssue[]): IssueType | undefined {
  if (issues.length === 0) return undefined;

  // 找出出现最频繁的问题
  return issues.sort((a, b) => b.frequency - a.frequency)[0].type;
}
```
