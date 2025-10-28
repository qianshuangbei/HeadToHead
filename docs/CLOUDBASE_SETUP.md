# CloudBase 数据库集合配置

## 集合清单

### 1. users - 用户集合
```json
{
  "_id": "string (openid)",
  "nickname": "string",
  "avatar": "string",                  // 原始头像(微信或上传)
  "display_nickname": "string",        // 显示用昵称
  "display_avatar": "string",          // 显示用头像(可裁剪/替换后)
  "completed_profile": "boolean",      // 是否已完成资料
  "phone": "string",
  "bio": "string",
  "handedness": "string (left|right)", // 持拍手
  "racket_primary": "string",          // 主力球拍描述
  "tags": ["string"],                  // 个人标签(≤20, 每个≤12字)
  "first_login_at": "number (timestamp)",
  "last_login_at": "number (timestamp)",
  "created_at": "number (timestamp)",
  "updated_at": "number (timestamp)"
}
```

**索引**: `_id`(主键)

---

### 2. groups - Group集合
```json
{
  "_id": "string (uuid)",
  "name": "string",
  "description": "string",
  "creator_id": "string",
  "access_code": "string (6位分享码)",
  "member_count": "int",
  "season_enabled": "boolean",
  "current_season_id": "string",
  "rules": {
    "match_type": ["singles", "doubles"],
    "points_system": "simple_count"
  },
  "created_at": "number",
  "updated_at": "number",
  "deleted_at": "number (软删除)"
}
```

**索引**: `access_code`, `creator_id`, `created_at`

---

### 3. group_members - Group成员集合
```json
{
  "_id": "string (uuid)",
  "group_id": "string",
  "user_id": "string",
  "joined_at": "number",
  "role": "string (creator|member|kicked)",
  "is_active": "boolean"
}
```

**索引**: `group_id`, `user_id`, `is_active`

---

### 4. seasons - 赛季集合
```json
{
  "_id": "string (uuid)",
  "group_id": "string",
  "season_name": "string",
  "status": "string (pending|active|ended|settled)",
  "start_date": "number (timestamp)",
  "end_date": "number (timestamp)",
  "duration_days": "int",
  "match_count": "int",
  "participant_count": "int",
  "created_at": "number",
  "updated_at": "number"
}
```

**索引**: `group_id`, `status`, `start_date`, `end_date`

---

### 5. matches - 比赛集合
```json
{
  "_id": "string (uuid)",
  "match_type": "string (singles|doubles)",
  "group_id": "string",
  "season_id": "string",

  "// 单打字段":
  "player_a_id": "string",
  "player_b_id": "string",

  "// 双打字段":
  "team_a": {
    "player1": "string",
    "player2": "string"
  },
  "team_b": {
    "player1": "string",
    "player2": "string"
  },

  "score": {
    "set1": {"player_a": 6, "player_b": 4},
    "set2": {"player_a": 7, "player_b": 5},
    "set3": {"player_a": 0, "player_b": 0}
  },

  "winning_player_id": "string (单打)",
  "winning_team": "string (双打: team_a|team_b)",

  "status": "string (pending|approved|rejected)",
  "created_by": "string",
  "created_at": "number",
  "approved_by": "string",
  "approved_at": "number",

  "// 双打审核字段":
  "approvals": [
    {
      "user_id": "string",
      "status": "string (pending|approved|rejected)",
      "approved_at": "number"
    }
  ],

  "tags": ["string"]
}
```

**索引**: `group_id`, `season_id`, `status`, `created_at`, `match_type`

---

### 6. season_rankings - 赛季排名集合
```json
{
  "_id": "string (uuid)",
  "season_id": "string",
  "user_id": "string",
  "rank": "int",
  "wins": "int",
  "losses": "int",
  "win_rate": "float",
  "recent_5_wins": "int",
  "match_count": "int",
  "updated_at": "number"
}
```

**索引**: `season_id`, `rank`, `user_id`

---

### 7. season_awards - 赛季奖项集合
```json
{
  "_id": "string (uuid)",
  "season_id": "string",
  "award_type": "string (mvp|best_record|most_active|fastest_progress)",
  "winner_id": "string",
  "award_value": "number",
  "created_at": "number"
}
```

**索引**: `season_id`, `award_type`, `winner_id`

---

## 安全规则配置

### users 集合
```javascript
{
  "read": "auth.uid == doc._id",
  "write": "auth.uid == doc._id"
}
```

### groups 集合
```javascript
{
  "read": "true",
  "write": "auth.uid == doc.creator_id"
}
```

### group_members 集合
```javascript
{
  "read": "true",
  "write": "auth.uid == doc.group_id creator_id (需要云函数验证)"
}
```

### matches 集合
```javascript
{
  "read": "true",
  "write": "auth.uid == doc.created_by"
}
```

### season_rankings 集合
```javascript
{
  "read": "true",
  "write": "false"  // 只有云函数可以修改
}
```

### season_awards 集合
```javascript
{
  "read": "true",
  "write": "false"  // 只有云函数可以修改
}
```

---

## 初始化步骤

1. **登录微信云开发控制台**
   - 访问: https://console.cloud.tencent.com/tcb

2. **创建环境**
   - 选择"按量计费"或"包年包月"
   - 记下环境ID (后续配置需要)

3. **创建数据库集合**
   - 依次创建上述7个集合
   - 配置对应的索引

4. **设置安全规则**
   - 在每个集合的"权限"标签页配置

5. **部署云函数**
   - 上传 `login`、`updateRankings`、`progressSeason` 三个云函数
   - 为 `progressSeason` 设置定时触发 (每天凌晨2点)

6. **更新小程序配置**
   - 在 `app.js` 中替换 `env: 'your-env-id'` 为实际的环境ID

---

## 定时任务配置

### updateRankings - 排名计算
- **触发频率**: 每30分钟
- **执行时间**: 避免高峰期
- **超时设置**: 30秒

### progressSeason - 赛季推进
- **触发频率**: 每天1次
- **执行时间**: 凌晨2点 (02:00:00)
- **超时设置**: 60秒

---

## 数据迁移 (如需从MySQL迁移)

```javascript
// 导出现有数据
db.collection('users').get()
  .then(res => console.log(JSON.stringify(res.data)))

// 批量导入到CloudBase
const batch = db.batch();
users.forEach(u => {
  batch.collection('users').doc(u._id).set(u);
});
batch.commit();
```

---

## 监控和调试

### 查看集合统计
```
在CloudBase控制台 → 数据库 → 选择集合 → 统计信息
```

### 查看云函数日志
```
在CloudBase控制台 → 云函数 → 选择函数 → 日志
```

### 本地测试云函数
```javascript
const cloud = require('wx-server-sdk');
cloud.init();

// 调用云函数
cloud.callFunction({
  name: 'updateRankings',
  data: {}
});
```

---

## 常见问题

**Q: 排名为什么没有更新?**
A: 检查是否有 approved 状态的比赛。排名只计算 approved 的比赛。

**Q: 赛季没有自动推进?**
A: 确保 progressSeason 云函数已部署且定时触发已启用。检查云函数日志。

**Q: 数据库读写限制?**
A: CloudBase 免费版有读写次数限制。超出后需要升级或优化查询。

---

**最后更新**: 2025-10-28
