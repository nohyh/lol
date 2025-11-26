# 英雄联盟数据分析网站代码审查报告

## 1. 概述

本次审查旨在找出导致英雄联盟数据分析网站数据（如MVP率、参团率、输出占比等）不准确的原因。经过对项目前端和后端代码的全面分析，我们定位了问题的根源并提出了修正建议。

**核心结论：** 数据计算错误的主要原因在于后端服务器的算法逻辑，尤其是**未能正确定位当前登录的玩家**，导致所有基于玩家个人表现的计算都使用了错误的数据源。前端代码没有问题，仅负责展示后端提供的数据。

---

## 2. 问题根源分析

问题的核心在于 `server/server.js` 文件中的 `/api/stats/advanced` 接口。该接口负责获取比赛历史、处理数据并计算各项统计指标。

### 2.1. 致命错误：错误的玩家身份识别

在处理每场比赛的数据时，代码做了以下假设：

```javascript
// server/server.js L103
// The first participant is always the current summoner in LCU match history
const player = game.participants[0];
```

代码**错误地假设`game.participants`数组的第一个元素 (`[0]`) 永远是当前登录的玩家**。LCU API的返回结果**不保证**参与者列表的顺序，因此这种方法极大概率会选中错误的玩家数据进行分析。

**后果：**
- **所有计算都基于一个随机的玩家**：可能是队友，也可能是对手。
- **KDA、参团率、伤害占比等全部错误**：因为计算的起点（玩家数据）就是错的。
- 这是导致所有下游数据指标（MVP率、平均KDA等）与实际情况严重不符的**根本原因**。

### 2.2. MVP/SVP 算法过于简单

代码中MVP（胜方最有价值选手）和SVP（败方最有价值选手）的评定标准过于单一：

```javascript
// server/server.js L150
// MVP/SVP calculation - highest KDA in the team
const playerKDA = (playerKills + playerAssists) / Math.max(playerDeaths, 1);
// ...
if (Math.abs(playerKDA - maxTeamKDA) < 0.01) {
    if (stats.win) {
        mvpCount++;
    } else {
        svpCount++;
    }
}
```

该算法仅凭**队内最高KDA**来判断MVP/SVP。虽然KDA是重要指标，但它忽略了其他关键贡献，例如：
- **伤害输出 (Damage)**
- **承受伤害 (Damage Taken)**
- **视野得分 (Vision Score)**
- **控制得分 (CC Score)**
- **对目标物的伤害 (Damage to Objectives)**

一个辅助或坦克可能KDA不高，但承受了大量伤害或提供了关键控制，对团队的贡献巨大。因此，仅基于KDA的MVP评定是不准确的，这也是导致MVP率与玩家实际感受不符的另一个重要原因。

### 2.3. 参团率和伤害占比的计算逻辑

- **参团率 (Kill Participation)**: `((playerKills + playerAssists) / teamKills) * 100`
- **伤害占比 (Damage Share)**: `(playerDamage / teamDamage) * 100`

这两个指标的**计算公式本身是正确的**。然而，由于上文提到的**玩家身份识别错误**，导致 `playerKills`, `playerAssists`, 和 `playerDamage` 等变量都是错误的，因此最终计算出的结果也是错误的。

---

## 3. 代码验证与调试分析

项目中的一些文件也佐证了我们的判断：

- **`client/src/components/LatestMatch.jsx`**: 这个组件被设计用来“验证数据”，它获取了**完整的10名玩家**的比赛数据并展示，但**没有尝试去识别当前玩家**。这表明开发者可能已经意识到了数据存在问题，并创建了这个工具来进行调试。

- **`AVAILABLE_STATS.md`**: 这个文件列出了大量可以从LCU API获取的、但尚未在网站上实现的数据点（如视野分、多杀统计、经济数据等）。这说明项目仍处于开发阶段，当前的功能可能只是初步实现。

---

## 4. 修正建议

由于本次任务要求不修改代码，我们在此提供详细的修正思路，以供后续开发参考。

### 4.1. 正确识别当前玩家

这是最重要的一步。必须在处理比赛数据前，先获取当前登录玩家的`summonerId`。

1.  **获取当前玩家信息**：在 `/api/stats/advanced` 接口的开头，首先调用 LCU 的 `/lol-summoner/v1/current-summoner` 接口，获取当前登录玩家的信息，特别是 `summonerId`。

    ```javascript
    const currentUser = await connector.request('/lol-summoner/v1/current-summoner');
    const currentSummonerId = currentUser.summonerId;
    ```

2.  **在循环中匹配玩家**：遍历每场比赛的 `participants` 数组，通过 `summonerId` 来找到正确的玩家数据。

    ```javascript
    // 替换 const player = game.participants[0];
    const player = game.participants.find(p => p.summonerId === currentSummonerId);

    // 如果找不到，说明该玩家未参与这场比赛（理论上不可能），应跳过
    if (!player) continue;
    ```

### 4.2. 改进 MVP/SVP 算法

为了更准确地评定MVP/SVP，建议采用**加权评分机制**，综合多个维度的表现。

1.  **定义评分模型**：为每个关键指标设置权重。例如：
    - KDA: 30%
    - 伤害占比: 25%
    - 承伤占比: 15%
    - 视野分占比: 15%
    - 参团率: 15%

2.  **计算团队内各项指标的最大值**：例如，计算团队最高的伤害、承伤、视野分等。

3.  **计算每个玩家的相对得分**：
    - `kdaScore = (playerKDA / maxTeamKDA) * 30`
    - `damageScore = (playerDamageShare / maxTeamDamageShare) * 25`
    - ...以此类推

4.  **计算总分**：将所有单项得分相加，得到每个玩家的最终表现分。

5.  **评定MVP/SVP**：在胜利的队伍中，总分最高的玩家为MVP；在失败的队伍中，总分最高的玩家为SVP。

---

## 5. 总结

该项目的数据错误问题是系统性的，源于后端一个**关键的逻辑假设错误**。一旦**玩家身份识别**的问题得到解决，参团率、伤害占比等核心数据将恢复正常。进一步优化MVP算法，可以大幅提升网站数据的准确性和用户体验。
