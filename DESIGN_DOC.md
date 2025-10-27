# 网球Group排名小程序 - Design Doc (MVP版本)

**项目名称**: HeadToHead (H2H)
**版本**: MVP v1.0
**创建日期**: 2025-10-27
**目标用户规模**: 100人
**核心定位**: 微信内的Group级非正式网球排名管理平台

---

## 1. 产品概述

### 1.1 核心价值主张
- **问题**: 每个网球群体都有自己的小圈子，现有UTR/ATP系统对大众不友好，缺乏Group内的排名体系
- **解决方案**: 提供轻量级、灵活的Group级排名系统，让每个社区可以创建自己的排名体系
- **关键差异**:
  - 基于Group而非全局排名（社区隔离，避免虚荣心冲突）
  - 支持赛季制（增强参与度和竞争性）
  - 简单易用（非正式比赛，不需要复杂规则）

### 1.2 MVP目标与成功指标
| 指标 | 目标 |
|-----|-----|
| 核心功能完成度 | Group创建+比赛录入+排名展示完整闭环 |
| 用户规模 | 100人活跃 |
| 比赛频率 | 人均≥3场/月 |
| Day-1留存率 | ≥50% |
| 审核通过率 | ≥90%(数据信任度) |

### 1.3 非MVP范围(P1及以后)
- ~~高级统计分析~~
- ~~社交评论功能~~
- ~~自定义规则引擎~~
- ~~付费功能~~
- ~~数据导出~~

---

## 2. 核心功能模块

### 2.1 用户认证与账户
**功能描述**:
- 微信登录(授权手机号和头像)
- 用户Profile(昵称、头像、简介)
- 用户隐私设置(是否在排名中可见)

**关键流程**:
```
首次打开小程序
  → 微信授权登录
  → 补充昵称
  → 进入主页
```

**数据字段**:
```json
{
  "user_id": "uuid",
  "wechat_open_id": "string",
  "nickname": "string",
  "avatar_url": "string",
  "phone": "string(可选，通过微信授权获取)",
  "bio": "string(个性签名，可选)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

### 2.2 Group管理

#### 2.2.1 创建Group
**功能描述**:
- Group创建者可设置基本信息
- 生成唯一分享码(6位字母数字组合)
- 支持赛季设置(可选，MVP版本强烈推荐启用)

**关键信息**:
```json
{
  "group_id": "uuid",
  "name": "string(如: 朝阳网球俱乐部)",
  "description": "string",
  "creator_id": "user_id",
  "access_code": "string(6位分享码，如: ABC123)",
  "avatar": "string(Group头像)",
  "is_public": "boolean(是否可搜索)",
  "member_count": "int",

  "season_enabled": "boolean(是否启用赛季制)",
  "current_season_id": "uuid(当前赛季)",

  "rules": {
    "match_type": ["singles", "doubles"],
    "points_system": "simple_count"  // MVP版本固定为简单胜场计数
  },

  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": "timestamp(软删除)"
}
```

#### 2.2.2 加入Group
**功能描述**:
- 扫描或输入分享码加入Group
- Group创建者可手动审核加入(可选)

**权限设置**:
| 角色 | 权限 |
|-----|-----|
| 创建者 | 查看成员、删除成员、修改Group设置、删除Group、审核加入请求(如启用) |
| 普通成员 | 上传比赛、查看排名、查看比赛历史 |
| 已移出成员 | 无权访问 |

#### 2.2.3 成员管理
**关键数据**:
```json
{
  "group_member_id": "uuid",
  "group_id": "uuid",
  "user_id": "uuid",
  "joined_at": "timestamp",
  "role": "creator | member | kicked",
  "is_active": "boolean"
}
```

---

### 2.3 赛季管理

#### 2.3.1 赛季设置(MVP关键功能)
**功能描述**:
- Group创建时可选择是否启用赛季制
- 若启用，创建者设置赛季时长和开始日期
- 赛季自动推进(到期自动结束，可手动提前结束)

**赛季生命周期**:
```
未开始 → 进行中 → 已结束 → 已结算(生成奖项)
```

**赛季数据模型**:
```json
{
  "season_id": "uuid",
  "group_id": "uuid",
  "season_name": "string(如: 2025春季赛)",
  "status": "pending | active | ended | settled",

  "start_date": "date",
  "end_date": "date",
  "duration_days": "int",

  "match_count": "int(该赛季总比赛数)",
  "participant_count": "int(参赛人数)",

  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### 2.3.2 赛季排名与奖项(MVP版本简化)
**MVP版本奖项**(自动计算):
```
1. MVP: 赛季积分最高的玩家
2. 最佳战绩: 胜率最高(min 5场比赛)
3. 最活跃: 参赛场数最多
4. 进步最快: 积分增长最多

(TAG类奖项如ACE王、发球直接得分、老登、德式高压等需要逐point数据，P1再做)
```

**支持的比赛TAG** (可选标记，P2实现自动统计):
- ACE王: 直接得分的发球
- 发球直接得分: 发球ace
- 老登: 高压球得分
- 德式高压: 网前高压得分
(用户可在上传比赛时选择标记这些特殊时刻)

**赛季结算流程**:
1. 赛季结束时，计算所有玩家的最终成绩
2. 自动生成4个基础奖项
3. 冻结赛季排名，不可修改历史比赛
4. 可选：开启新赛季(重置排名为0)或继续累积

**关键数据**:
```json
{
  "season_ranking": {
    "season_id": "uuid",
    "user_id": "uuid",
    "rank": "int",
    "wins": "int",
    "losses": "int",
    "total_points": "int",
    "win_rate": "float",
    "match_count": "int"
  },

  "season_award": {
    "award_id": "uuid",
    "season_id": "uuid",
    "award_type": "mvp | best_record | most_active | fastest_progress",
    "winner_id": "uuid",
    "award_value": "any(如积分数)"
  }
}
```

---

### 2.4 比赛录入与审核(核心功能)

#### 2.4.1 比赛类型与数据结构

**单打比赛**:
```json
{
  "match_id": "uuid",
  "match_type": "singles",
  "season_id": "uuid",
  "group_id": "uuid",

  "player_a_id": "user_id(上传者)",
  "player_b_id": "user_id(对手)",

  "score": {
    "set1": {"player_a": 6, "player_b": 4},
    "set2": {"player_a": 7, "player_b": 5}
    // 可支持第三盘
  },
  "winning_player_id": "user_id(赢家自动推导)",

  "status": "pending | approved | rejected",
  "created_by": "user_id(上传者)",
  "created_at": "timestamp",
  "approved_by": "user_id(审核人)",
  "approved_at": "timestamp",

  "tags": ["ACE", "破发", "反转"] // MVP版本可留字段但功能暂不做
}
```

**双打比赛**:
```json
{
  "match_id": "uuid",
  "match_type": "doubles",
  "season_id": "uuid",
  "group_id": "uuid",

  "team_a": {
    "player1_id": "user_id",
    "player2_id": "user_id"
  },
  "team_b": {
    "player1_id": "user_id",
    "player2_id": "user_id"
  },

  "score": {
    "set1": {"team_a": 6, "team_b": 4},
    "set2": {"team_a": 7, "team_b": 5}
  },
  "winning_team": "team_a | team_b",

  "status": "pending | approved | rejected",
  "created_by": "user_id(4个参赛者中的任意一个)",
  "created_at": "timestamp",
  "approvals": [
    {
      "user_id": "uuid",
      "status": "pending | approved | rejected",
      "approved_at": "timestamp"
    }
  ]
}
```

#### 2.4.2 比赛录入流程

**单打流程**:
```
玩家A创建比赛
  ├─ 输入: 对手(玩家B)
  ├─ 输入: 比分(set1: 6-4, set2: 7-5等)
  ├─ 输入: 比赛日期(可选，默认今天)
  └─ 提交
    ↓
显示"待对手审核"
    ↓
玩家B收到通知
  ├─ 可选审核界面显示: A的info、建议的比分、A的最近战绩
  └─ 点击"确认"或"拒绝"
    ↓
【如果B确认】
  ├─ 比赛入库
  ├─ 更新两人积分
  ├─ 更新排名
  └─ A、B各收一条"比赛已入库"通知
    ↓
【如果B拒绝或24h未操作】
  ├─ A可重新编辑/取消
  └─ 支持申诉(P1)
```

**双打流程**:
```
4人中任意一人创建比赛
  ├─ 选择对手(另3人从其他Group成员中选)
  ├─ 输入比分
  └─ 提交
    ↓
另外3人都需要approve (OR逻辑可选，建议初期用AND)
    ↓
4人全部approve后 → 比赛入库，4人各获得积分
```

#### 2.4.3 审核逻辑与超时处理
| 场景 | 行为 |
|-----|-----|
| 对手24h未审核 | 提醒发起方重新编辑或重新提交，支持申诉到管理员(P1) |
| 对手拒绝 | 显示理由(可选)，可重新编辑后重新提交 |
| 对手确认 | 立即更新排名，双方可在排名中看到该比赛 |
| 比赛approved后修改 | 数据锁定，不允许修改。若有误需申诉(P1) |

**关键决策**：采用人工审核 + 申诉机制（安全性最高），不自动入库

---

### 2.5 排名展示

#### 2.5.1 Group排名(MVP核心)
**排名计算**:
```
积分系统 (选项A: 简单胜场数制):
  • 赢一场比赛 = +1胜
  • 同积分情况下按: 胜场数 > 最近5场胜率 > 加入时间排序
  • 最近5场胜率：用于区分两个玩家都是10胜的情况
    例: 玩家A (10胜2负, 最近5场4胜1负) > 玩家B (10胜8负, 最近5场2胜3负)

排名字段:
{
  "rank": "int(第N名)",
  "user_id": "uuid",
  "nickname": "string",
  "avatar": "string",
  "wins": "int(总胜场)",
  "losses": "int(总负场)",
  "match_count": "int(总比赛数)",
  "win_rate": "float(胜率 = wins/(wins+losses))",
  "recent_matches": [ // 最近5场
    {
      "opponent": "string",
      "result": "W | L",
      "score": "6-4 7-5",
      "date": "date",
      "match_type": "singles | doubles"
    }
  ],
  "all_matches": [ // 点击展开看全部
    {同上结构}
  ]
}
```

#### 2.5.2 UI展示
**排名页**:
```
┌─────────────────────┐
│  朝阳网球俱乐部      │ ← Group名称
│  2025春季赛 | 10天后结束 │ ← 赛季info
├─────────────────────┤
│ 排名  玩家    胜场  │
│  1   张三    10    │
│  2   李四    9     │
│  3   王五    8     │
│ ...                │
├─────────────────────┤
│ 点击任一玩家展开：  │
│ ┌─────────────────┐│
│ │ 张三 (10胜3负)  ││
│ │ 胜率: 77%       ││
│ │ 参赛: 13场      ││
│ │                 ││
│ │ 最近5场:        ││
│ │ ✓ vs李四 6-4   ││
│ │ ✓ vs王五 7-5   ││
│ │ ✗ vs赵六 4-6   ││
│ │ ...             ││
│ │ [查看全部比赛]  ││
│ └─────────────────┘│
└─────────────────────┘
```

#### 2.5.3 赛季切换
- 若Group启用赛季制，排名页顶部有"赛季选择"下拉框
- 可查看当前赛季或历史赛季的排名
- 赛季结束后显示"该赛季已结束，点击查看奖项"

---

### 2.6 比赛历史查询
**功能**:
- 查看自己的所有比赛(可按单打/双打/赛季筛选)
- 查看与某对手的交手记录
- 导出功能(P1+)

---

## 3. 数据模型

### 3.1 核心实体关系图
```
User (用户)
  ├─ Group (通过 GroupMember)
  ├─ Match (作为 player_a/player_b 或 team参与者)
  └─ Season (通过 Group)

Group (小团体)
  ├─ Season (赛季，一对多)
  ├─ Match (比赛，一对多)
  ├─ GroupMember (成员关系，一对多)
  └─ Award (赛季奖项，一对多)

Season (赛季)
  ├─ Match (该赛季所有比赛)
  ├─ SeasonRanking (赛季排名)
  └─ Award (该赛季奖项)
```

### 3.2 完整表结构

#### 表1: users
```sql
CREATE TABLE users (
  user_id VARCHAR(36) PRIMARY KEY,
  wechat_open_id VARCHAR(100) UNIQUE NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  bio VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);
```

#### 表2: groups
```sql
CREATE TABLE groups (
  group_id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
  access_code VARCHAR(10) UNIQUE NOT NULL,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,

  season_enabled BOOLEAN DEFAULT TRUE,
  current_season_id VARCHAR(36),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  UNIQUE KEY uc_access_code (access_code),
  INDEX idx_creator (creator_id),
  INDEX idx_current_season (current_season_id)
);
```

#### 表3: group_members
```sql
CREATE TABLE group_members (
  group_member_id VARCHAR(36) PRIMARY KEY,
  group_id VARCHAR(36) NOT NULL REFERENCES groups(group_id),
  user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
  role ENUM('creator', 'admin', 'member', 'kicked') DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,

  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  kicked_at TIMESTAMP NULL,

  UNIQUE KEY uc_group_user (group_id, user_id),
  INDEX idx_user (user_id),
  INDEX idx_group (group_id),
  INDEX idx_role (role)
);
```

#### 表4: seasons
```sql
CREATE TABLE seasons (
  season_id VARCHAR(36) PRIMARY KEY,
  group_id VARCHAR(36) NOT NULL REFERENCES groups(group_id),
  season_name VARCHAR(100) NOT NULL,
  status ENUM('pending', 'active', 'ended', 'settled') DEFAULT 'active',

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  match_count INT DEFAULT 0,
  participant_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_group (group_id),
  INDEX idx_status (status)
);
```

#### 表5: matches
```sql
CREATE TABLE matches (
  match_id VARCHAR(36) PRIMARY KEY,
  match_type ENUM('singles', 'doubles') NOT NULL,
  season_id VARCHAR(36) NOT NULL REFERENCES seasons(season_id),
  group_id VARCHAR(36) NOT NULL REFERENCES groups(group_id),

  -- 单打字段
  player_a_id VARCHAR(36) REFERENCES users(user_id),
  player_b_id VARCHAR(36) REFERENCES users(user_id),

  -- 双打字段存储为JSON
  team_a_players JSON, -- [player1_id, player2_id]
  team_b_players JSON,

  score JSON NOT NULL, -- {"set1": {"player_a": 6, "player_b": 4}, ...}
  winning_player_id VARCHAR(36), -- 单打赢家
  winning_team ENUM('team_a', 'team_b'), -- 双打赢家

  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_by VARCHAR(36) NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  approved_by VARCHAR(36), -- 单打审核人
  approved_at TIMESTAMP NULL,

  match_date DATE NOT NULL,

  tags JSON, -- ["ACE", "破发"] (预留)

  INDEX idx_season (season_id),
  INDEX idx_group (group_id),
  INDEX idx_status (status),
  INDEX idx_player_a (player_a_id),
  INDEX idx_player_b (player_b_id),
  INDEX idx_match_date (match_date),
  INDEX idx_created_at (created_at)
);
```

#### 表6: match_approvals (双打审核记录)
```sql
CREATE TABLE match_approvals (
  approval_id VARCHAR(36) PRIMARY KEY,
  match_id VARCHAR(36) NOT NULL REFERENCES matches(match_id),
  user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),

  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_at TIMESTAMP NULL,

  UNIQUE KEY uc_match_user (match_id, user_id),
  INDEX idx_match (match_id),
  INDEX idx_user (user_id)
);
```

#### 表7: season_rankings (赛季排名快照)
```sql
CREATE TABLE season_rankings (
  ranking_id VARCHAR(36) PRIMARY KEY,
  season_id VARCHAR(36) NOT NULL REFERENCES seasons(season_id),
  user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),

  rank INT,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  match_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uc_season_user (season_id, user_id),
  INDEX idx_season (season_id),
  INDEX idx_user (user_id),
  INDEX idx_rank (rank)
);
```

#### 表8: season_awards (赛季奖项)
```sql
CREATE TABLE season_awards (
  award_id VARCHAR(36) PRIMARY KEY,
  season_id VARCHAR(36) NOT NULL REFERENCES seasons(season_id),
  award_type ENUM('mvp', 'best_record', 'most_active', 'fastest_progress') NOT NULL,

  winner_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
  award_value VARCHAR(200), -- 如: "10胜" 或 "进步+5胜"

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_season (season_id),
  INDEX idx_winner (winner_id),
  UNIQUE KEY uc_season_award (season_id, award_type)
);
```

---

## 4. API设计 (RESTful)

### 4.1 用户相关

| 方法 | 端点 | 功能 | 认证 |
|-----|-----|-----|-----|
| POST | `/api/v1/auth/wechat-login` | 微信登录 | ✗ |
| GET | `/api/v1/users/me` | 获取当前用户信息 | ✓ |
| PUT | `/api/v1/users/:id` | 更新用户信息 | ✓ |

### 4.2 Group相关

| 方法 | 端点 | 功能 | 认证 |
|-----|-----|-----|-----|
| POST | `/api/v1/groups` | 创建Group | ✓ |
| GET | `/api/v1/groups/:id` | 获取Group详情 | ✓ |
| GET | `/api/v1/groups/:id/members` | 获取Group成员列表 | ✓ |
| POST | `/api/v1/groups/:id/join` | 加入Group(通过分享码) | ✓ |
| DELETE | `/api/v1/groups/:id/members/:user_id` | 移出成员 | ✓(权限检查: admin/creator) |
| PUT | `/api/v1/groups/:id/members/:user_id/role` | 修改成员角色(任命admin) | ✓(权限检查: creator only) |
| GET | `/api/v1/users/me/groups` | 获取当前用户的所有Group | ✓ |

### 4.3 赛季相关

| 方法 | 端点 | 功能 | 认证 |
|-----|-----|-----|-----|
| GET | `/api/v1/groups/:id/seasons` | 获取Group的所有赛季 | ✓ |
| GET | `/api/v1/seasons/:id` | 获取赛季详情 | ✓ |
| POST | `/api/v1/seasons/:id/end` | 提前结束赛季并结算 | ✓(权限检查) |

### 4.4 比赛相关

| 方法 | 端点 | 功能 | 认证 |
|-----|-----|-----|-----|
| POST | `/api/v1/matches` | 创建比赛记录 | ✓ |
| GET | `/api/v1/matches/:id` | 获取比赛详情 | ✓ |
| POST | `/api/v1/matches/:id/approve` | 审核并approve比赛 | ✓(权限检查) |
| POST | `/api/v1/matches/:id/reject` | 拒绝比赛 | ✓(权限检查) |
| GET | `/api/v1/seasons/:id/matches` | 获取赛季内的所有比赛 | ✓ |
| GET | `/api/v1/users/:id/matches` | 获取用户的比赛历史 | ✓ |

### 4.5 排名相关

| 方法 | 端点 | 功能 | 认证 |
|-----|-----|-----|-----|
| GET | `/api/v1/groups/:id/rankings` | 获取Group当前排名(含最新赛季) | ✓ |
| GET | `/api/v1/seasons/:id/rankings` | 获取赛季最终排名 | ✓ |
| GET | `/api/v1/seasons/:id/awards` | 获取赛季奖项 | ✓ |

### 4.6 API请求/响应示例

**创建比赛 (单打)**:
```
POST /api/v1/matches
Content-Type: application/json
Authorization: Bearer <token>

{
  "match_type": "singles",
  "season_id": "season_123",
  "player_b_id": "user_456",
  "score": {
    "set1": {"player_a": 6, "player_b": 4},
    "set2": {"player_a": 7, "player_b": 5}
  },
  "match_date": "2025-10-27"
}

Response 201:
{
  "match_id": "match_789",
  "status": "pending",
  "created_at": "2025-10-27T10:00:00Z",
  "message": "比赛已提交，等待对手审核"
}
```

**审核比赛**:
```
POST /api/v1/matches/match_789/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "approve"
}

Response 200:
{
  "match_id": "match_789",
  "status": "approved",
  "approved_at": "2025-10-27T10:05:00Z",
  "ranking_update": {
    "player_a": { "rank": 1, "wins": 11, "losses": 3 },
    "player_b": { "rank": 2, "wins": 9, "losses": 4 }
  }
}
```

**获取排名**:
```
GET /api/v1/groups/group_123/rankings
Authorization: Bearer <token>

Response 200:
{
  "group_id": "group_123",
  "season_id": "season_123",
  "season_name": "2025春季赛",
  "rankings": [
    {
      "rank": 1,
      "user_id": "user_001",
      "nickname": "张三",
      "avatar": "https://...",
      "wins": 10,
      "losses": 3,
      "match_count": 13,
      "win_rate": 0.77,
      "recent_matches": [
        {
          "opponent": "李四",
          "result": "W",
          "score": "6-4 7-5",
          "date": "2025-10-27",
          "match_type": "singles"
        }
      ]
    },
    ...
  ]
}
```

---

## 5. 技术架构

### 5.1 技术栈

| 层 | 技术选型 | 说明 |
|----|---------|-----|
| **前端** | 微信小程序(Taro / 原生) | 主要框架，支持iOS/Android |
| **后端** | Node.js + Express / Java Spring | API服务 |
| **数据库** | MySQL 8.0 | 关系数据存储 |
| **缓存** | Redis | 排名快速查询、实时统计 |
| **消息队列** | RabbitMQ / Redis Stream | 异步处理排名更新、通知 |
| **认证** | JWT + 微信OAuth2 | 安全认证 |

### 5.2 架构图
```
┌─────────────────────────────────────────┐
│       微信小程序客户端(Taro)             │
│  ├─ 首页(推荐Group/我的Group)           │
│  ├─ Group详情(排名/成员/比赛)           │
│  ├─ 比赛录入(单打/双打表单)             │
│  └─ 个人中心(我的比赛/统计)             │
└──────────────┬──────────────────────────┘
               │ HTTP/HTTPS
┌──────────────▼──────────────────────────┐
│        API Gateway (负载均衡)            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         后端服务 (Node.js Express)      │
│  ├─ Auth Service (微信登录)             │
│  ├─ Group Service (创建/管理)           │
│  ├─ Match Service (比赛CRUD)            │
│  ├─ Ranking Service (排名计算)          │
│  ├─ Season Service (赛季管理)           │
│  └─ Notification Service (通知)        │
└──┬───────────────┬───────────┬──────────┘
   │               │           │
┌──▼────┐  ┌──────▼──┐  ┌─────▼──────┐
│ MySQL │  │  Redis  │  │ Message Q  │
│ (数据 │  │ (缓存)  │  │ (异步处理) │
│ 库)   │  │         │  │            │
└───────┘  └─────────┘  └────────────┘
```

### 5.3 关键设计决策

#### 5.3.1 排名实时更新策略
```
Option A: 实时计算 (推荐MVP)
  • 比赛approved时，立即重算排名
  • 优点: 用户看到最新排名，及时反馈
  • 缺点: 100人规模暂无压力

Option B: 定时更新
  • 每5分钟/1小时批量更新排名
  • 优点: 减少计算频率
  • 缺点: 用户看不到实时更新

Option C: 混合
  • 实时更新排名数据
  • 每5分钟生成排名快照(性能优化)

建议: MVP采用 Option A (100人量级完全可承受)
```

#### 5.3.2 比赛审核超时处理
```
流程:
1. 比赛created_at时记录
2. 每小时的定时任务检查是否有24h未审核的比赛
3. 若存在，标记为"审核超时"，A可选择:
   - 撤销重新编辑
   - 催促B(再发一条通知)
   - 申诉(P1功能，让管理员人工判断)

建议: MVP先不自动入库，保持安全性
```

#### 5.3.3 并发控制
```
场景: 两个对手同时上传了相同比赛

解决:
1. 比赛created_by标记上传者
2. 审核时检查是否已存在相同的待审核比赛
3. 提示用户"可能已有相同比赛待审核"
4. 允许重复提交但第二个会自动reject或合并

建议MVP: 允许重复提交，但提醒用户
```

---

## 6. 业务规则与算法

### 6.1 积分计算规则(选项A: 简单胜场数制)

#### 单打
```
玩家A赢一场单打比赛 → A.wins += 1, B.losses += 1
后续排名基于: wins降序 → 若wins相同则loss升序 → 若都相同则match_count降序 → 加入时间升序
```

#### 双打
```
队伍A赢一场双打比赛 → A队的4个玩家各 wins += 1

为什么?
- 避免复杂的队伍积分系统
- 鼓励每个人都参与
- 对应题目中"个人排名"的需求
```

### 6.2 赛季排名冻结与推进

```
赛季状态转变:
1. 创建时: pending
2. 开始日期到达时: 自动转为 active
3. 结束日期到达时: 自动转为 ended
4. 管理员手动结算: 转为 settled (生成奖项，可选开启新赛季)

数据处理:
- ended/settled状态的赛季排名不可修改
- 但可以查看历史数据
```

### 6.3 奖项计算逻辑

| 奖项 | 计算公式 | 最小要求 |
|-----|---------|---------|
| MVP | wins最大值 | 参赛≥1场 |
| 最佳战绩 | win_rate最大值 | 参赛≥5场 |
| 最活跃 | match_count最大值 | 参赛≥1场 |
| 进步最快 | Δwins最大值(vs赛季开始) | 参赛≥1场 |

---

## 7. 前端页面流程与UI框架

### 7.1 主要页面列表

| 页面 | 功能 | 优先级 |
|-----|-----|-------|
| 登录页 | 微信授权 | P0 |
| 首页 | Group列表 + 创建/加入 | P0 |
| Group详情 | 排名 + 赛季选择 | P0 |
| 排名详情 | 展开玩家详情 + 最近5场 | P0 |
| 比赛录入 | 单打/双打表单 | P0 |
| 比赛待审核 | 审核界面 | P0 |
| 比赛历史 | 查看全部比赛 | P1 |
| 赛季结果 | 查看已结束赛季的奖项 | P1 |
| 个人中心 | 用户信息 + 我的Group | P1 |

### 7.2 关键交互流程

**创建Group流程**:
```
首页 → "创建Group"按钮
  → 填写Group名称、描述、头像
  → 选择"是否启用赛季制"
  → 若启用，设置赛季时长、开始日期
  → 点击"创建"
  → 自动生成分享码(6位)
  → 显示"创建成功，分享码: ABC123"
  → 进入新Group详情页
```

**加入Group流程**:
```
首页 → "加入Group"按钮
  → 输入/扫描分享码
  → 点击"加入"
  → 若需审核: 显示"已提交申请，等待管理员通过"
  → 若无需审核: 直接进入Group
```

**上传比赛流程 (单打)**:
```
Group详情 → 排名 → "记录比赛"按钮
  → 选择"单打"
  → 选择对手(从Group成员列表)
  → 输入Set数和各Set比分
  → 选择比赛日期(默认今天)
  → 点击"提交"
  → 显示"比赛已提交，等待对手审核"
  → 通知对手有待审核比赛
```

**审核比赛流程**:
```
对手收到"有人提交了与你的比赛"通知
  → 点击进入审核界面
  → 显示: 对手信息、建议比分、对方最近战绩
  → 点击"确认"或"有误，拒绝"
  → 若确认: 比赛入库，双方排名立即更新
  → 若拒绝: 对手可重新编辑或取消
```

---

## 8. 部署与运维

### 8.1 部署架构
```
开发环境 → 测试环境 → 预发环境 → 生产环境
  ↓         ↓         ↓         ↓
特性分支   develop  release   main分支
```

### 8.2 监控告警
- API响应时间(P99延迟 < 500ms)
- 数据库查询耗时
- 错误日志(日均错误率 < 0.1%)
- 用户登录成功率(> 99%)
- 比赛数据一致性(定期校验)

### 8.3 数据备份
- 每日全量备份
- 每小时增量备份
- 跨地域备份(生产)

---

## 9. 风险与合规

### 9.1 数据安全
- ✓ 所有API传输HTTPS加密
- ✓ 密码/敏感数据加密存储
- ✓ 微信OAuth2认证
- ✓ JWT令牌有效期(24h自动刷新)

### 9.2 反作弊机制 (MVP版本)
```
基础防护:
1. 用户信任度评分(未来可加)
   - 提交的比赛被拒绝率
   - 审核通过率

2. 异常检测(预留)
   - 同一对手连续大比分(如6-0)
   - 短时间内大量比赛提交
   - 排名异常波动

MVP版本: 依赖人工审核(对手approve)
```

### 9.3 微信小程序合规
- ✓ 隐私政策(获取头像、昵称)
- ✓ 用户协议(数据使用)
- ✓ 内容审核(评论、标签等，P1+)
- ✓ 微信支付资格(若涉及付费，后续)

### 9.4 法律风险
- 用户生成的比赛数据属于用户
- 平台不对比赛真实性负责(依赖双方认可)
- 免责声明(在用户协议中说明)

---

## 10. 项目时间表与里程碑

### 10.1 MVP开发周期 (预计12-16周)

| 阶段 | 时间 | 内容 | 交付 |
|-----|-----|-----|-----|
| **第1-2周** | 需求评审 + 架构设计 | 确定技术栈、API spec | 技术方案文档 |
| **第3-5周** | 后端核心功能 | Auth、Group、Match、Ranking API | 后端API |
| **第6-8周** | 前端基础功能 | 小程序端UI、登录、首页、排名 | 前端基础 |
| **第9-10周** | 集成测试 + 联调 | 完整功能流程验证 | 可用的Staging环境 |
| **第11周** | 灰度测试 | 邀请20-50个测试用户 | 反馈 + 迭代 |
| **第12周** | 优化 + 发布准备 | 性能优化、文案审核、微信审核 | 正式上线 |

### 10.2 P1功能计划 (赛后迭代)

- [ ] 历史比赛查看 + 筛选
- [ ] 赛季结果展示 + 奖项分享
- [ ] 自定义积分规则
- [ ] 比赛申诉流程
- [ ] 用户信誉评分
- [ ] 统计数据导出
- [ ] 比赛评论功能
- [ ] 推荐算法

---

## 11. 成功指标与KPI

| 指标 | 目标 | 测量方式 |
|-----|-----|---------|
| DAU | 50+ | 日活用户数 |
| 日均比赛数 | 20+ | 系统记录 |
| 人均参赛频率 | 3场/月 | 统计分析 |
| 比赛审核通过率 | ≥90% | 数据库查询 |
| 平均响应时间 | <300ms | 监控系统 |
| 用户满意度 | ≥4.5/5 | 应用商店评分 |
| 比赛数据完整性 | 100% | 定期审计 |

---

## 12. 附录：FAQ与澄清

**Q: 为什么选择简单胜场数而不是积分制？**
A: MVP阶段需要快速上线。简单胜场数易于理解、计算快速、不需要复杂配置。后续可迭代到积分制或ELO系统。

**Q: 双打为什么不支持队伍独立排名？**
A: 为了保持MVP简洁性，所有玩家共享一个排名。队伍是临时组合，不持久化。P1版本可加入队伍排名。

**Q: 赛季如何自动推进？**
A: 后端定时任务每天检查赛季状态，根据start_date/end_date自动转移状态。也支持管理员手动操作。

**Q: 如果玩家拒绝了一场比赛，能否申诉？**
A: MVP版本暂不支持。提交者可重新编辑后重新提交，或联系管理员。P1版本可加入正式申诉流程。

**Q: 是否需要支持"发起方同时是审核方"？**
A: 不需要。单打必须是对手approve，双打需要所有参赛者（除了上传者）approve。

---

## 13. 细化需求决策汇总 (基于9维度问卷)

### 13.1 维度1: 比赛录入与审核
| 问题 | 决策 | 影响 |
|-----|-----|-----|
| 审核超时处理 | **方案B**: 提醒发起方重新编辑/提交 | 安全性优先，不自动入库 |
| 比赛后修改权限 | **方案A**: 数据锁定，不允许修改 | 需要申诉机制(P1) |
| 比赛TAG标签 | **ACE王、发球直接得分、老登、德式高压** | MVP版本支持标记，P2自动统计 |

### 13.2 维度2: 排名与积分体系
| 问题 | 决策 | 实现细节 |
|-----|-----|---------|
| 同积分排序 | **胜负数 + 最近5场胜率 + 加入时间** | 多级排序算法 |
| 新赛季积分 | **全部重置为0** | 每个赛季独立计分 |
| 中断赛季处理 | **允许继续编辑比赛到手动结束** | 赛季状态=ended不可添加新比赛 |

### 13.3 维度3: 赛季设计
| 问题 | 决策 | 备注 |
|-----|-----|-----|
| 赛季参赛者 | **动态**: 赛季开始后新加入Group成员自动进入当前赛季 | 保持灵活性 |
| 多赛季并行 | **单赛季**: 一个Group只能有1个进行中赛季 | MVP简洁性 |
| 奖项自定义 | **固定4个奖项**: MVP/最佳战绩/最活跃/进步最快 | P1支持自定义 |

### 13.4 维度4: 数据与统计
| 问题 | 决策 | 页面位置 |
|-----|-----|---------|
| 玩家详情页 | **最近5场 + 交手记录 + 全部历史 + 胜负趋势图** | 点击排名展开 |
| 导出功能 | **不支持** | MVP不做，保持轻量 |
| 对手交手记录 | **详细**: 显示每场比赛的对比 | 玩家详情内的"vs对手"标签页 |

### 13.5 维度5: 社交与互动
| 问题 | 决策 | 实现方式 |
|-----|-----|---------|
| 消息通知 | **比赛待审核 + approve/reject结果 + 首次MVP成就** | 微信模板消息/服务通知 |
| 比赛评论 | **不支持** | P2功能 |
| 分享功能 | **分享Group排名到群聊** | 生成排名截图/卡片 |

### 13.6 维度6: 权限与管理
| 问题 | 决策 | 权限表 |
|-----|-----|-------|
| 管理员设置 | **创建者可任命多个管理员** | creator / admin / member三级 |
| 成员移出权限 | **管理员可移出** | 管理员和创建者都可操作 |
| 黑名单功能 | **不支持** | MVP不做，P1考虑 |

### 13.7 维度7: 技术与性能
| 问题 | 决策 | 技术方案 |
|-----|-----|---------|
| 实时更新 | **每次approved时实时更新排名** | 无缓存延迟，100人规模可承受 |
| 离线功能 | **不支持** | 要求实时登录 |
| 跨Group统计 | **不需要** | 每个Group独立 |

### 13.8 维度8: 商业化与运营
| 问题 | 决策 | 备注 |
|-----|-----|-----|
| Group创建限制 | **不限制** | 用户可创建无限个Group |
| 变现方式 | **暂不考虑** | MVP专注用户积累 |
| Group认证 | **不支持** | P1考虑官方认证功能 |

### 13.9 维度9: 其他
| 问题 | 答案 | 影响 |
|-----|-----|-----|
| 初始用户来源 | **朋友圈** | 需要高质量的分享体验 |
| 参考竞品 | **滑呗、掌上英雄联盟** | 学习赛季制和排名体验 |
| 绝对必需功能 | **无** | 需求已覆盖MVP核心 |

---

### 13.10 关键业务规则

#### 赛季状态转移图
```
pending → active → ended → settled
  ↓         ↓        ↓       ↓
 待开始    进行中   已结束  已结算
          (手动结束)
             ↑
             └─ 管理员可手动提前结束
```

#### 比赛审核状态流
```
单打:
pending → approved / rejected
   ↓            ↓
 待审核      已入库
   ↓            ↓
  B审核    更新排名
   或
 24h超时
```

#### 排名计算优先级
```
胜场数(primary)
  → 最近5场胜率(secondary)
  → 加入时间(tertiary)

例:
  玩家A: 10胜3负, 最近5场 4-1 (80%) → 排名1
  玩家B: 10胜8负, 最近5场 2-3 (40%) → 排名2
  (都是10胜，但A最近5场胜率更高)
```

---

### 13.11 MVP发布准备清单

#### 功能完整性
- [x] Group创建/加入/分享
- [x] 单打比赛录入+审核
- [x] 双打比赛录入+审核
- [x] 实时排名展示(+ 最近5场)
- [x] 历史比赛查看
- [x] 赛季管理(自动推进+手动结算)
- [x] 4个基础奖项自动计算
- [x] 消息通知(3种)
- [x] 用户认证(微信登录)
- [x] 管理员功能

#### 数据质量
- [ ] 排名计算逻辑测试(100+场景)
- [ ] 比赛approve/reject逻辑验证
- [ ] 赛季状态转移测试
- [ ] 并发写入测试(多人同时提交)
- [ ] 数据一致性校验

#### 性能指标(100人规模)
- [ ] 排名页加载时间 < 500ms
- [ ] 比赛提交响应 < 1s
- [ ] 排名更新延迟 < 100ms
- [ ] 并发用户100+ 无明显卡顿

#### 用户体验
- [ ] 流程清晰(5个主页面)
- [ ] 通知及时(< 2min延迟)
- [ ] 错误提示友好
- [ ] 分享卡片美观

---

**Design Doc Version**: 1.1
**Last Updated**: 2025-10-27
**Status**: 包含9维度深化需求，可启动开发
