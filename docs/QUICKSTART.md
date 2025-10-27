# CloudBase MVP 快速开始指南

## 项目目录结构

```
HeadToHead/
├── miniprogram/                    # 小程序前端
│   ├── app.js                     # 主程序入口
│   ├── app.json                   # 小程序配置
│   ├── app.wxss                   # 全局样式
│   │
│   ├── pages/
│   │   ├── index/                 # 首页 (Group列表)
│   │   ├── auth/                  # 登录相关页面
│   │   ├── group/                 # Group管理
│   │   │   ├── create.wxml        # 创建Group
│   │   │   ├── join.wxml          # 加入Group
│   │   │   └── detail.wxml        # Group详情+排名
│   │   ├── match/                 # 比赛相关
│   │   │   ├── upload-singles.wxml
│   │   │   ├── upload-doubles.wxml
│   │   │   ├── review.wxml
│   │   │   └── history.wxml
│   │   └── profile/               # 个人页面
│   │
│   ├── components/                # 可复用组件
│   │   ├── ranking-table/         # 排名表格
│   │   ├── match-card/            # 比赛卡片
│   │   └── group-card/            # Group卡片
│   │
│   ├── utils/
│   │   ├── api.js                 # CloudBase API封装
│   │   └── constants.js           # 常量定义
│   │
│   ├── assets/                    # 资源文件
│   │   └── icons/                 # Tab图标等
│   │
│   └── sitemap.json               # 小程序入口配置
│
├── cloudfunctions/                # 云函数
│   ├── login/                     # 用户登录
│   ├── updateRankings/            # 排名计算(30分钟一次)
│   └── progressSeason/            # 赛季推进(每天凌晨)
│
├── CLOUDBASE_SETUP.md            # CloudBase配置文档
├── QUICKSTART.md                 # 快速开始 (本文件)
├── DESIGN_DOC.md                 # 产品设计文档
└── DEVELOPER_GUIDE.md            # 开发指南
```

---

## 环境配置 (5分钟)

### 1. 申请微信云开发环境

1. 打开微信云开发官网: https://cloud.tencent.com/product/tcb
2. 点击"开通云开发"
3. 使用小程序账号登录
4. 选择"按量计费" (免费额度足够MVP)
5. 创建环境，记下 **环境ID**

### 2. 配置小程序代码

编辑 `miniprogram/app.js`:

```javascript
wx.cloud.init({
  env: 'your-env-id',  // ⬅️ 替换成你的环境ID
  traceUser: true,
});
```

### 3. 在微信开发者工具中

1. 打开微信开发者工具
2. 导入 `miniprogram` 文件夹
3. 右上角点击"云开发" → "开通"

---

## 快速部署 (10分钟)

### Step 1: 创建CloudBase数据库集合

在CloudBase控制台:

```
云开发 → 数据库 → 新建集合
```

创建以下7个集合:
- `users`
- `groups`
- `group_members`
- `seasons`
- `matches`
- `season_rankings`
- `season_awards`

详细配置见 [CLOUDBASE_SETUP.md](CLOUDBASE_SETUP.md)

### Step 2: 部署云函数

```bash
# 在微信开发者工具中
右上角 → 云开发 → 云函数 → 上传全部
```

或手动上传:
1. 云函数 → 新建
2. 名称: `login`, `updateRankings`, `progressSeason`
3. 复制对应的 `.js` 文件内容
4. 保存并部署

### Step 3: 设置定时触发

**updateRankings** (排名计算):
- 云函数 → updateRankings → 配置 → 触发器
- 新增定时触发: 每30分钟执行一次
- Cron: `*/30 * * * *`

**progressSeason** (赛季推进):
- 云函数 → progressSeason → 配置 → 触发器
- 新增定时触发: 每天凌晨2点
- Cron: `0 2 * * *`

### Step 4: 配置数据库安全规则

在CloudBase控制台，为每个集合配置权限:

```javascript
// users: 只能读写自己的数据
{
  "read": "auth.uid == doc._id",
  "write": "auth.uid == doc._id"
}

// groups: 所有人可读，只有创建者可写
{
  "read": "true",
  "write": "auth.uid == doc.creator_id"
}

// matches: 所有人可读，只有上传者可写
{
  "read": "true",
  "write": "auth.uid == doc.created_by"
}

// 其他集合详见 CLOUDBASE_SETUP.md
```

---

## 本地开发测试 (持续)

### 1. 启动小程序

```bash
# 微信开发者工具
点击"预览"或"真机调试"
```

### 2. 测试基本流程

- [ ] 微信登录
- [ ] 创建Group
- [ ] 加入Group (通过分享码)
- [ ] 上传单打比赛
- [ ] 审核比赛
- [ ] 查看排名

### 3. 查看云函数日志

```
云开发 → 云函数 → 选择函数 → 日志
```

监控是否有错误。

### 4. 查看数据库

```
云开发 → 数据库 → 选择集合 → 查看文档
```

确认数据是否正确保存。

---

## MVP功能清单

### ✅ 已实现
- [x] 用户登录(微信OAuth)
- [x] Group创建与加入
- [x] 成员管理
- [x] 单打比赛录入与审核
- [x] 排名计算与展示
- [x] 赛季管理(自动推进)
- [x] 赛季奖项计算

### ⏳ 需要完成
- [ ] 双打比赛完整流程
- [ ] 比赛历史查询
- [ ] 消息通知 (比赛待审核、审核结果)
- [ ] 成员权限管理
- [ ] 完整UI/UX细化
- [ ] 错误处理与异常提示
- [ ] 性能优化

### 📅 计划表

| 阶段 | 时间 | 关键任务 |
|------|------|---------|
| 环境搭建 | 今天 | CloudBase环境+云函数部署 |
| 核心功能 | 本周 | 双打流程+完整页面 |
| 测试优化 | 下周 | UI调整+bug修复 |
| 微信审核 | 2周后 | 提交审核 |

---

## 常见问题

### Q: 小程序运行时提示"环境ID无效"
A: 检查 `app.js` 中的 `env` 是否正确。应该是你在云开发控制台创建的环境ID。

### Q: 比赛数据为什么没有入库?
A: 检查比赛状态是否为 `approved`。排名只计算 approved 的比赛。

### Q: 排名为什么没有更新?
A: 确保 `updateRankings` 云函数已部署且定时触发已启用。检查云函数执行日志。

### Q: 如何查看完整的API文档?
A: 参考 `miniprogram/utils/api.js`，所有数据库操作都在这里。

### Q: 能否离线使用?
A: 不能。CloudBase需要网络连接。可以考虑添加数据缓存。

---

## 下一步

1. **完成所有页面的UI**
   - 参考WeUI设计系统
   - 实现所有剩余页面 (见 `pages/` 目录)

2. **添加错误处理**
   - 网络异常提示
   - 业务逻辑异常处理

3. **消息通知**
   - 比赛待审核通知
   - 审核结果推送

4. **性能优化**
   - 数据缓存
   - 排名刷新频率优化

5. **微信审核前检查**
   - 隐私政策
   - 用户协议
   - 内容合规审查

---

## 技术支持

- 微信云开发文档: https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/
- CloudBase官网: https://cloud.tencent.com/product/tcb
- 小程序开发论坛: https://developers.weixin.qq.com/community/

---

**开始时间**: 2025-10-27
**更新时间**: 2025-10-27
**维护者**: HeadToHead 开发团队
