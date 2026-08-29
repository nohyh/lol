# LoL Advanced Stats Analyzer · 英雄联盟进阶数据分析器

一个直接连接 **League of Legends Client（LCU）** 的本地数据分析应用，用来分析排位表现、团队贡献与一些客户端没有直接展示的进阶指标。

## 主要功能

- **综合表现评级**：根据 MVP / SVP、KDA、胜率、输出转化率、团队贡献等指标给出整体评价
- **输出转化率**：对比伤害占比与经济占比，衡量“吃资源后打出多少输出”
- **视野与团队贡献**：统计视野得分、插眼、参团等指标
- **队内排名**：比较经济、补刀、视野、参团等维度在队伍中的位置
- **玩家搜索**：分析比赛历史或好友列表中的其他玩家
- **并行处理**：对最近 50 场排位进行并行统计，减少等待时间

## 技术栈

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Integration**: League Client Update API（LCU）
- **Communication**: 本地 HTTPS / REST

## 运行要求

- Node.js 14+
- League of Legends 客户端已启动并登录

## 本地运行

```bash
npm install
npm start
```

启动后访问：

```text
http://localhost:5173
```

应用会尝试自动识别当前登录的召唤师，也可以手动搜索其他玩家。

## 项目定位

这是一个偏兴趣驱动的数据产品项目，重点是：

- 与本地桌面客户端 API 集成
- 对比赛历史做批量聚合
- 从原始比赛数据推导更有解释性的指标
- 把统计结果做成可浏览的 Web 界面

## License

MIT
