# CloudBase MVP 快速参考卡

## 🚀 30秒快速开始

```bash
1. 打开微信云开发: https://cloud.tencent.com/product/tcb
2. 创建环境 → 记录环境ID
3. 更新 miniprogram/app.js 中的环境ID
4. 用微信开发者工具打开 miniprogram/ 文件夹
5. 按照 QUICKSTART.md 创建7个集合 + 3个云函数
6. 点击"预览"测试小程序
```

---

## 📁 核心文件位置

| 文件 | 功能 | 行数 |
|------|------|------|
| `miniprogram/app.js` | 应用入口，初始化CloudBase | 33 |
| `miniprogram/utils/api.js` | 所有数据库操作 | 371 |
| `cloudfunctions/login/index.js` | 用户登录 | 14 |
| `cloudfunctions/updateRankings/index.js` | 排名计算 | 136 |
| `cloudfunctions/progressSeason/index.js` | 赛季推进 | 150 |
| `miniprogram/pages/index/index.js` | 首页 | 89 |
| `miniprogram/pages/group/detail.js` | Group详情+排名 | 120 |
| `miniprogram/pages/match/upload-match.js` | 比赛上传 | 135 |

---

## 🔑 关键API函数

### 用户
```javascript
api.getUserOrCreate(openid, userInfo)     // 获取或创建用户
api.updateUserInfo(openid, userData)      // 更新用户信息
```

### Group
```javascript
api.createGroup(creatorId, groupData)     // 创建Group
api.joinGroupByCode(userId, accessCode)   // 加入Group
api.getUserGroups(userId)                 // 获取用户的Groups
api.getGroupDetail(groupId)               // 获取Group详情+成员
```

### 比赛
```javascript
api.createSinglesMatch(...)               // 创建单打
api.approveSinglesMatch(...)              // 审核单打
api.getPendingMatches(userId, groupId)    // 获取待审核比赛
```

### 排名
```javascript
api.getSeasonRankings(seasonId)           // 获取赛季排名
api.getCurrentRanking(groupId)            // 获取当前排名
```

### 赛季
```javascript
api.createSeason(...)                     // 创建赛季
api.getGroupSeasons(groupId)              // 获取Group赛季列表
```

---

## 🗄️ 数据库集合速查

### users (用户)
```
_id: openid
nickname, avatar, phone, bio
created_at, updated_at
```

### groups (Group)
```
_id, name, creator_id
access_code (6位分享码)
member_count, season_enabled
current_season_id
```

### group_members (成员)
```
group_id, user_id
joined_at, role (creator|member)
is_active
```

### seasons (赛季)
```
group_id, season_name
status (pending|active|ended|settled)
start_date, end_date
```

### matches (比赛)
```
match_type (singles|doubles)
group_id, season_id
player_a_id, player_b_id (单打)
team_a, team_b (双打)
score, winning_player_id
status (pending|approved|rejected)
```

### season_rankings (排名)
```
season_id, user_id
rank, wins, losses
win_rate, recent_5_wins
```

### season_awards (奖项)
```
season_id, award_type
winner_id, award_value
```

---

## ☁️ 云函数快速调用

### 本地测试
```javascript
wx.cloud.callFunction({
  name: 'login',
  data: {},
  success: res => console.log(res)
});
```

### 设置定时触发

**updateRankings** (排名计算)
- Cron: `*/30 * * * *` (每30分钟)
- 超时: 30秒

**progressSeason** (赛季推进)
- Cron: `0 2 * * *` (每天凌晨2点)
- 超时: 60秒

---

## 🧪 基本测试流程

```
1. 微信登录 (首页)
   ✓ 点击"微信登录"
   ✓ 授权头像和昵称

2. 创建Group (首页)
   ✓ 填写Group名称
   ✓ 启用赛季制
   ✓ 设置赛季时间
   ✓ 提交 → 生成6位分享码

3. 加入Group (另一个用户)
   ✓ 输入分享码
   ✓ 加入成功

4. 上传单打比赛 (Group详情)
   ✓ 选择对手
   ✓ 输入比分
   ✓ 提交

5. 审核比赛 (对手端)
   ✓ 查看待审核列表
   ✓ 点击"确认"

6. 查看排名 (Group详情)
   ✓ 排名已更新
   ✓ 赢家积分+1
```

---

## ⚡ 常用代码片段

### 初始化CloudBase
```javascript
const db = api.initCloudBase();
```

### 查询集合
```javascript
db.collection('users').doc(openid).get()

db.collection('groups')
  .where({ creator_id: userId })
  .get()
```

### 创建文档
```javascript
db.collection('matches').add({
  match_type: 'singles',
  player_a_id: userId1,
  player_b_id: userId2,
  ...
})
```

### 更新文档
```javascript
db.collection('matches').doc(matchId).update({
  status: 'approved',
  approved_by: userId
})
```

---

## 🐛 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 环境ID无效 | 检查app.js中的env值 |
| 权限拒绝 | 检查数据库安全规则 |
| 排名不更新 | 确保updateRankings云函数已部署 |
| 赛季不推进 | 检查progressSeason定时触发配置 |
| 比赛未入库 | 检查比赛status是否为'approved' |

---

## 📱 页面导航关键参数

```javascript
// 进入Group详情
wx.navigateTo({ url: `/pages/group/detail?groupId=${id}` })

// 上传比赛
wx.navigateTo({ url: `/pages/match/upload-match?groupId=${id}` })

// 返回
wx.navigateBack()
```

---

## 🔐 权限矩阵

| 操作 | Creator | Member | 非成员 |
|------|---------|--------|--------|
| 查看排名 | ✓ | ✓ | ✗ |
| 上传比赛 | ✓ | ✓ | ✗ |
| 审核比赛 | ✓ | ✓* | ✗ |
| 修改Group | ✓ | ✗ | ✗ |
| 删除成员 | ✓ | ✗ | ✗ |

*仅审核涉及自己的比赛

---

## 📊 数据流关键路径

### 比赛审核流程
```
创建者上传 (status: pending)
    ↓
对手收到待审核通知
    ↓
对手审核 (status: approved/rejected)
    ↓
云函数updateRankings定时运行
    ↓
计算排名写入season_rankings
    ↓
前端查询排名展示
```

### 赛季推进流程
```
创建赛季 (status: pending, start_date: T)
    ↓
云函数progressSeason每天检查
    ↓
若当前时间 >= start_date: status → active
    ↓
若当前时间 >= end_date: status → ended
    ↓
自动计算4个赛季奖项
```

---

## 🎯 优化建议

### 性能
- [ ] 添加数据缓存 (LocalStorage)
- [ ] 排名查询使用分页
- [ ] 减少不必要的数据库查询

### 功能
- [ ] 消息推送通知
- [ ] 比赛历史高级搜索
- [ ] 玩家统计卡片

### UX
- [ ] 加载动画优化
- [ ] 错误提示美化
- [ ] 离线模式支持

---

## 📞 紧急联系

- 微信小程序官方: https://developers.weixin.qq.com
- CloudBase技术支持: https://cloud.tencent.com/support
- 项目文档: 本项目目录下的 DESIGN_DOC.md

---

**保存此卡供随时查阅！** 🎾
