# CloudBase 环境配置步骤详解

## 第一步: 申请CloudBase环境 (5分钟)

### 1.1 访问微信云开发
- 打开浏览器: https://cloud.tencent.com/product/tcb
- 或直接: https://console.cloud.tencent.com/tcb

### 1.2 创建环境
1. 登录腾讯云账号 (或用微信扫码)
2. 点击 **"立即开通"** 或 **"新建"**
3. 选择 **"按量计费"** (推荐MVP)
   - 免费额度足够100人测试
   - 包括: 50GB存储、100万次读写、1000小时云函数
4. 选择区域 (建议选择 **华东地区** 以获得最佳延迟)
5. 点击 **"开通"** 并等待环境初始化 (约1-2分钟)

### 1.3 获取环境信息
环境创建后，你会看到:
- **环境ID**: 类似 `h2h-prod-xxxxx`
- **环境名称**: 自定义名称
- 记录 **环境ID** - 后续需要用到

**✅ 完成**: 你现在有了一个云开发环境

---

## 第二步: 创建数据库集合 (15分钟)

### 2.1 进入数据库管理
1. 打开CloudBase控制台
2. 左侧菜单 → **云开发** → **数据库**
3. 选择你的环境
4. 点击 **"新建集合"**

### 2.2 创建7个集合

逐个创建以下集合 (按此顺序):

#### 集合1: `users`
```
名称: users
描述: 用户信息集合
字段:
  _id (主键): openid (字符串)
  nickname: 昵称
  avatar: 头像URL
  phone: 电话
  bio: 个人简介
  created_at: 创建时间 (时间戳)
  updated_at: 更新时间 (时间戳)
```

#### 集合2: `groups`
```
名称: groups
字段:
  _id: Group ID
  name: Group名称
  description: 描述
  creator_id: 创建者ID
  access_code: 分享码 (6位)
  member_count: 成员数
  season_enabled: 是否启用赛季
  current_season_id: 当前赛季ID
  created_at: 创建时间
  updated_at: 更新时间

索引: access_code, creator_id, created_at
```

#### 集合3: `group_members`
```
名称: group_members
字段:
  _id: 记录ID
  group_id: Group ID
  user_id: 用户ID
  joined_at: 加入时间
  role: 角色 (creator/member/kicked)
  is_active: 是否活跃

索引: group_id, user_id, is_active
```

#### 集合4: `seasons`
```
名称: seasons
字段:
  _id: 赛季ID
  group_id: Group ID
  season_name: 赛季名称
  status: 状态 (pending/active/ended/settled)
  start_date: 开始时间戳
  end_date: 结束时间戳
  duration_days: 持续天数
  match_count: 比赛数
  participant_count: 参赛人数
  created_at: 创建时间
  updated_at: 更新时间

索引: group_id, status, start_date, end_date
```

#### 集合5: `matches`
```
名称: matches
字段:
  _id: 比赛ID
  match_type: 类型 (singles/doubles)
  group_id: Group ID
  season_id: 赛季ID
  player_a_id: 选手A (单打)
  player_b_id: 选手B (单打)
  team_a: {player1, player2} (双打)
  team_b: {player1, player2} (双打)
  score: {set1, set2, set3}
  winning_player_id: 赢家ID (单打)
  winning_team: 赢队伍 (双打: team_a/team_b)
  status: 状态 (pending/approved/rejected)
  created_by: 上传者ID
  created_at: 创建时间
  approved_by: 审核者ID
  approved_at: 审核时间
  tags: 标签数组

索引: group_id, season_id, status, created_at, match_type
```

#### 集合6: `season_rankings`
```
名称: season_rankings
字段:
  _id: 排名记录ID
  season_id: 赛季ID
  user_id: 用户ID
  rank: 排名
  wins: 胜场数
  losses: 负场数
  win_rate: 胜率 (float)
  recent_5_wins: 最近5场胜数
  match_count: 总比赛数
  updated_at: 更新时间

索引: season_id, rank, user_id
```

#### 集合7: `season_awards`
```
名称: season_awards
字段:
  _id: 奖项ID
  season_id: 赛季ID
  award_type: 奖项类型
    (mvp / best_record / most_active / fastest_progress)
  winner_id: 获奖者ID
  award_value: 奖项值 (数字)
  created_at: 创建时间

索引: season_id, award_type, winner_id
```

### 2.3 验证集合创建
- 进入CloudBase控制台 → 数据库
- 你应该看到7个集合都已列出
- 尝试向 `users` 集合添加一条测试数据

**✅ 完成**: 所有数据库集合已创建

---

## 第三步: 配置安全规则 (10分钟)

### 3.1 进入集合权限设置
1. 数据库 → 选择集合
2. 点击 **"权限"** 标签

### 3.2 为每个集合配置权限

#### users 集合
```javascript
{
  "read": "auth.uid == doc._id",
  "write": "auth.uid == doc._id"
}
```
含义: 只能读写自己的用户数据

#### groups 集合
```javascript
{
  "read": "true",
  "write": "auth.uid == doc.creator_id"
}
```
含义: 所有人可读，只有创建者可修改

#### group_members 集合
```javascript
{
  "read": "true",
  "write": "true"
}
```
注意: 实际应由云函数验证，但为了简化MVP暂时开放

#### seasons 集合
```javascript
{
  "read": "true",
  "write": "false"
}
```
含义: 所有人可读，只有云函数可写

#### matches 集合
```javascript
{
  "read": "true",
  "write": "auth.uid == doc.created_by"
}
```
含义: 所有人可读，只有上传者可写

#### season_rankings 集合
```javascript
{
  "read": "true",
  "write": "false"
}
```
含义: 所有人可读，只有云函数可写

#### season_awards 集合
```javascript
{
  "read": "true",
  "write": "false"
}
```
含义: 所有人可读，只有云函数可写

### 3.3 保存权限配置
- 点击 **"保存并发布"** 按钮
- 等待配置生效 (约10秒)

**✅ 完成**: 所有安全规则已配置

---

## 第四步: 部署云函数 (15分钟)

### 4.1 准备云函数代码
确保你有以下3个云函数文件:
```
cloudfunctions/
├── login/
│   ├── index.js
│   └── package.json
├── updateRankings/
│   ├── index.js
│   └── package.json
└── progressSeason/
    ├── index.js
    └── package.json
```

### 4.2 上传云函数

#### 方法1: 用微信开发者工具 (推荐快速)
1. 打开微信开发者工具
2. 导入 `miniprogram` 文件夹
3. 顶部菜单 → **云开发**
4. 点击 **"上传全部"**
5. 系统会自动上传 `cloudfunctions/` 下所有函数

#### 方法2: 手动在网页控制台上传
1. CloudBase控制台 → **云函数**
2. 点击 **"新建"**
3. 函数名: `login`
4. 选择Node.js 12
5. 复制 `cloudfunctions/login/index.js` 的内容粘贴
6. 点击 **"保存并部署"**
7. 重复上传 `updateRankings` 和 `progressSeason`

### 4.3 验证云函数
1. CloudBase控制台 → **云函数**
2. 你应该看到3个函数:
   - `login`
   - `updateRankings`
   - `progressSeason`

**✅ 完成**: 所有云函数已部署

---

## 第五步: 配置定时触发 (10分钟)

### 5.1 为 updateRankings 设置定时触发

1. 云函数列表 → 找到 `updateRankings`
2. 点击函数名进入详情
3. 找到 **"触发器"** 或 **"配置"** 标签
4. 点击 **"新建触发器"** 或 **"添加定时触发"**
5. 设置参数:
   ```
   类型: 定时触发
   触发周期: 自定义
   Cron表达式: */30 * * * *
   说明: 排名计算，每30分钟执行一次
   ```
6. 保存

### 5.2 为 progressSeason 设置定时触发

1. 云函数列表 → 找到 `progressSeason`
2. 点击函数名进入详情
3. 点击 **"新建触发器"**
4. 设置参数:
   ```
   类型: 定时触发
   触发周期: 每天
   执行时间: 02:00:00 (凌晨2点)
   或用Cron: 0 2 * * *
   说明: 赛季自动推进
   ```
5. 保存

### 5.3 验证触发器配置
- CloudBase控制台 → 云函数 → 选择函数
- 查看 **"触发器"** 列表，确认两个定时任务都已创建

**✅ 完成**: 所有定时任务已配置

---

## 第六步: 更新小程序代码 (5分钟)

### 6.1 更新环境ID
编辑 `miniprogram/app.js`:

```javascript
// 找到这一行:
wx.cloud.init({
  env: 'your-env-id',  // ⬅️ 改这里
  traceUser: true,
});

// 改成你的环境ID，例如:
wx.cloud.init({
  env: 'h2h-prod-xxxxx',  // 你从第一步记录的环境ID
  traceUser: true,
});
```

### 6.2 验证配置
保存文件后，代码已准备好

**✅ 完成**: 小程序代码已更新

---

## 第七步: 本地测试 (持续)

### 7.1 启动小程序
1. 打开微信开发者工具
2. 导入 `miniprogram` 文件夹
3. 等待编译完成
4. 点击 **"预览"** 或 **"真机调试"**

### 7.2 测试基本流程
```
✓ 步骤1: 点击"微信登录"按钮
  - 授权头像和昵称
  - 应该跳转到首页

✓ 步骤2: 点击"创建Group"
  - 填写Group名称
  - 启用赛季制
  - 提交后应该看到分享码

✓ 步骤3: 复制分享码，用另一个微信账号登录
  - 点击"加入Group"
  - 输入分享码
  - 应该看到该Group在列表中

✓ 步骤4: 进入Group详情
  - 应该看到排名表 (初始为空)
  - 应该看到"上传比赛"按钮

✓ 步骤5: 点击"上传单打"
  - 选择对手
  - 输入比分
  - 提交

✓ 步骤6: 用对手账号登录
  - 应该看到"待我审核"列表
  - 点击"确认"审核

✓ 步骤7: 返回排名页
  - 排名应该已更新
  - 赢家积分应该+1
```

### 7.3 查看日志
1. CloudBase控制台 → **云函数** → 选择函数 → **日志**
2. 查看是否有任何错误

### 7.4 检查数据库
1. CloudBase控制台 → **数据库**
2. 打开各个集合查看是否有数据
   - `users`: 应该有2个用户
   - `groups`: 应该有1个Group
   - `group_members`: 应该有2条记录
   - `matches`: 应该有1场比赛
   - 等等

**✅ 完成**: 基本功能已验证

---

## 🔍 故障排除

### 问题1: 环境ID填错
**症状**: 小程序报错 "环境ID无效"
**解决**:
1. 打开CloudBase控制台
2. 查看左上角环境名旁边的环境ID
3. 复制完整ID粘贴到app.js

### 问题2: 权限不足，无法写入数据
**症状**: 上传比赛时报错 "权限拒绝"
**解决**:
1. 检查数据库权限配置
2. 确保写权限规则正确
3. 试试暂时改为 `"write": "true"` 测试 (生产环境不要这样做)

### 问题3: 云函数执行超时
**症状**: 查看日志显示函数未在规定时间内完成
**解决**:
1. 检查云函数代码是否有死循环
2. 增加超时时间: 点击云函数 → 配置 → 超时时间改为60秒

### 问题4: 排名没有更新
**症状**: 审核了比赛但排名未变
**解决**:
1. 等待30分钟 (updateRankings定时执行)
2. 或手动在CloudBase控制台调用 updateRankings 云函数
3. 检查比赛是否真的是 'approved' 状态

---

## 📊 环境配置清单

打印此表并逐项完成:

```
□ 第一步: CloudBase环境创建
  □ 1.1 访问cloud.tencent.com
  □ 1.2 创建环境 (选择按量计费)
  □ 1.3 记录环境ID: ________________

□ 第二步: 数据库集合创建
  □ 2.1 创建 users 集合
  □ 2.2 创建 groups 集合
  □ 2.3 创建 group_members 集合
  □ 2.4 创建 seasons 集合
  □ 2.5 创建 matches 集合
  □ 2.6 创建 season_rankings 集合
  □ 2.7 创建 season_awards 集合

□ 第三步: 安全规则配置
  □ 3.1 users 权限配置
  □ 3.2 groups 权限配置
  □ 3.3 group_members 权限配置
  □ 3.4 seasons 权限配置
  □ 3.5 matches 权限配置
  □ 3.6 season_rankings 权限配置
  □ 3.7 season_awards 权限配置

□ 第四步: 云函数部署
  □ 4.1 上传 login 函数
  □ 4.2 上传 updateRankings 函数
  □ 4.3 上传 progressSeason 函数

□ 第五步: 定时触发配置
  □ 5.1 updateRankings 设置 */30 * * * *
  □ 5.2 progressSeason 设置 0 2 * * *

□ 第六步: 代码更新
  □ 6.1 更新 app.js 中的环境ID
  □ 6.2 保存并验证

□ 第七步: 本地测试
  □ 7.1 用微信开发者工具预览
  □ 7.2 测试7步基本流程
  □ 7.3 检查云函数日志
  □ 7.4 验证数据库数据
```

完成全部后，你的CloudBase MVP就已经配置完成了！🎉

---

**预计总时间**: 60-90分钟 (第一次)
**必备工具**: 微信开发者工具、浏览器
**联系支持**: CloudBase官方文档或项目文档

祝配置顺利！🚀
