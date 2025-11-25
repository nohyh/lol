# 英雄联盟数据分析 - 可用数据清单

根据LCU match history API提供的数据，以下是所有可统计的有趣指标：

## ✅ 已实现的基础数据
1. **平均KDA** - (K+A)/D
2. **场均击杀/死亡/助攻** - kills, deaths, assists
3. **胜率** - 胜场/总场次
4. **场均伤害（对英雄）** - totalDamageDealtToChampions
5. **场均承伤** - totalDamageTaken
6. **每分钟补刀** - (totalMinionsKilled + neutralMinionsKilled) / duration

---

## 🎯 推荐新增的高价值数据

### 伤害分析
- **伤害占比构成**
  - 物理伤害% - physicalDamageDealtToChampions
  - 魔法伤害% - magicDamageDealtToChampions
  - 真实伤害% - trueDamageDealtToChampions
  
- **场均对塔伤害** - damageDealtToTurrets (拆塔能力)
- **场均对大龙/先锋伤害** - damageDealtToObjectives (打资源能  力)
- **场均自身减伤** - damageSelfMitigated (坦度指标)

### 击杀相关
- **多杀统计**
  - 双杀次数 - doubleKills
  - 三杀次数 - tripleKills  
  - 四杀次数 - quadraKills
  - 五杀次数 - pentaKills
  
- **最大连杀** - largestKillingSpree (单场最高连杀)
- **连杀场次** - killingSprees (有连杀的游戏数)

### 经济数据
- **场均经济** - goldEarned
- **场均买装备金币** - goldSpent
- **平均等级** - champLevel

### 视野数据 ⭐（非常重要！）
- **场均视野分** - visionScore
- **场均插眼数** - wardsPlaced
- **场均排眼数** - wardsKilled  
- **场均真眼购买** - visionWardsBoughtInGame

### 控制与生存
- **场均控制时长** - timeCCingOthers (秒)
- **平均最长存活时间** - longestTimeSpentLiving

### 推塔/建筑
- **场均推塔数** - turretKills
- **场均破水晶数** - inhibitorKills

### 首杀/首个目标
- **一血率** - firstBloodKill (获得一血的次数)
- **一血助攻率** - firstBloodAssist
- **首塔击杀/助攻率** - firstTowerKill, firstTowerAssist

---

## 🌟 最推荐展示的10个指标（优先级排序）

1. **平均KDA** - 最核心指标
2. **胜率** - 最关键结果
3. **场均伤害（对英雄）** - Carry能力
4. **视野分** - 意识体现⭐
5. **每分钟补刀** - 基本功
6. **多杀统计（2/3/4/5杀）** - 高光时刻⭐
7. **场均经济** - 发育能力
8. **一血率** - 前期节奏⭐
9. **场均推塔数** - 推进能力
10. **伤害构成（物理/魔法/真实）** - 伤害类型分析

## 💡 创新展示方式

### 1. 击杀效率
- **击杀参与率** = (K+A) / (K+A+D) × 100%
- 评价：高于70%为优秀，50-70为良好，低于50需改进

### 2. 生存效率  
- **场均死亡** - 越低越好
- 评价：<3优秀，3-5良好，>5需改进

### 3. 视野贡献
- **插眼/排眼比** - wardsPlaced / wardsKilled
- **真眼平均购买** - 每局>=1个为合格

### 4. 经济效率
- **每分钟经济** = goldEarned / gameDuration
- **补刀转化率** = goldEarned / (CS × 平均价值)

### 5. Carry指标
- **对英雄伤害/分钟**
- **对塔伤害/分钟**
- **对大龙伤害/总场次**

---

## 🎨 UI展示建议

### 核心卡片（大尺寸）
- KDA
- 胜率
- 场均伤害

### 次要卡片（中尺寸）
- 视野分
- CS/Min
- 经济

### 亮点卡片（小尺寸，彩色）
- 五杀/四杀次数（金色⭐）
- 一血次数（红色💀）
- 连杀记录（橙色🔥）

### 图表展示
- **伤害构成饼图** - 物理/魔法/真实
- **多杀统计柱状图** - 2杀/3杀/4杀/5杀
- **视野趋势折线图** - 最近N场的视野分变化
