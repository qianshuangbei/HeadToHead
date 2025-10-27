# miniprogram 和 cloudfunctions 的关系

## 🏗️ 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    微信小程序用户端                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  miniprogram/                                        │  │
│  │  ├─ pages/          (UI页面 - 用户看到的界面          │  │
│  │  ├─ utils/api.js    (API调用层 - 和后端通讯)          │  │
│  │  ├─ app.js          (初始化CloudBase)                │  │
│  │  └─ ...             (其他页面和样式)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↓↓↓ wx.cloud.callFunction() ↓↓↓                │
└─────────────────────────────────────────────────────────────┘
                           ↓
            ┌──────────────────────────────────┐
            │      微信 CloudBase 后端           │
            │  ┌──────────────────────────────┐│
            │  │  cloudfunctions/             ││
            │  │  ├─ login/                   ││  (云函数层 - 处理业务逻辑)
            │  │  ├─ updateRankings/          ││
            │  │  └─ progressSeason/          ││
            │  └──────────────────────────────┘│
            │             ↓↓↓                  │
            │  ┌──────────────────────────────┐│
            │  │  CloudBase 数据库             ││
            │  │  ├─ users                    ││
            │  │  ├─ groups                   ││
            │  │  ├─ matches                  ││
            │  │  ├─ season_rankings          ││
            │  │  └─ ...                      ││
            │  └──────────────────────────────┘│
            └──────────────────────────────────┘
```

---

## 📱 miniprogram (小程序前端)

**位置**: `d:\src\HeadToHead\miniprogram\`

**作用**: 用户看到的界面、用户交互

**包含内容**:
```
miniprogram/
├── app.js                    ← 初始化CloudBase连接
├── pages/                    ← 所有UI页面
│   ├── index/               ← 首页
│   ├── group/detail.js      ← Group详情页
│   └── match/upload.js      ← 比赛上传页
├── utils/api.js             ← 和后端通讯的API函数
└── ...
```

**主要职责**:
1. 显示UI给用户
2. 收集用户输入 (如上传比赛)
3. **调用云函数或访问数据库**
4. 显示返回的数据

**代码示例 - 上传比赛**:
```javascript
// miniprogram/pages/match/upload-singles.js

// 用户点击"上传比赛"按钮
handleUpload() {
  // 1. 收集用户输入的数据
  const matchData = {
    groupId: this.data.groupId,
    opponent: this.data.selectedOpponent,
    score: this.data.score
  };

  // 2. 调用API函数 (在utils/api.js中定义)
  api.createSinglesMatch(matchData)
    .then(result => {
      // 3. 显示成功提示
      wx.showToast({ title: '上传成功' });
    });
}
```

---

## ☁️ cloudfunctions (后端云函数)

**位置**: `d:\src\HeadToHead\cloudfunctions\`

**作用**: 处理复杂业务逻辑、定时任务、数据计算

**包含内容**:
```
cloudfunctions/
├── login/                    ← 处理用户登录
├── updateRankings/           ← 计算排名 (每30分钟自动运行)
└── progressSeason/           ← 赛季推进 (每天凌晨自动运行)
```

**主要职责**:
1. 处理复杂的业务逻辑 (小程序无法做的)
2. 定时任务 (如每30分钟更新排名)
3. 访问数据库 (服务器端安全访问)
4. 返回处理结果给小程序

**代码示例 - 排名计算云函数**:
```javascript
// cloudfunctions/updateRankings/index.js

exports.main = async (event, context) => {
  // 这个函数每30分钟自动运行一次
  // 小程序无法手动调用排名计算

  // 1. 获取所有比赛数据
  const matches = await db.collection('matches')
    .where({ status: 'approved' })
    .get();

  // 2. 在服务器端计算排名 (复杂算法)
  const rankings = calculateRankings(matches.data);

  // 3. 保存排名到数据库
  rankings.forEach(r => {
    db.collection('season_rankings').add(r);
  });

  return { code: 0, message: '排名更新完成' };
};
```

---

## 🔄 通讯过程详解

### 场景1: 用户上传比赛 (小程序 → 云函数 → 数据库)

```
┌─────────────────────────────────────────────────────────┐
│ 第一步: 用户在小程序中上传比赛                          │
│ miniprogram/pages/match/upload-singles.js              │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 第二步: 小程序调用API                                  │
│ wx.cloud.callFunction({                               │
│   name: 'createSinglesMatch',                         │
│   data: { score: { set1: { a: 6, b: 4 } } }         │
│ })                                                    │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 第三步: 云函数处理请求                                │
│ cloudfunctions/createSinglesMatch/index.js            │
│ - 验证数据                                            │
│ - 保存到数据库                                        │
│ - 返回结果给小程序                                    │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 第四步: 小程序收到结果，显示成功提示                   │
│ wx.showToast({ title: '上传成功' })                   │
└─────────────────────────────────────────────────────────┘
```

### 场景2: 排名自动更新 (定时运行云函数)

```
┌─────────────────────────────────────────────────────────┐
│ 每30分钟自动触发 (不需要用户操作)                      │
│ CloudBase 定时器 → 运行 updateRankings 云函数          │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 云函数运行                                             │
│ cloudfunctions/updateRankings/index.js                │
│ 1. 获取所有approved的比赛                             │
│ 2. 计算排名算法                                       │
│ 3. 更新season_rankings集合                            │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 用户打开小程序查看排名                                │
│ - 排名已自动更新                                      │
│ - 无需用户做任何事情                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 对比总结

| 项目 | miniprogram | cloudfunctions |
|------|------------|-----------------|
| **位置** | 微信小程序客户端 | CloudBase服务器 |
| **语言** | JavaScript (小程序语法) | JavaScript (Node.js) |
| **能做什么** | 显示UI、收集输入、调用后端 | 处理复杂逻辑、定时任务、安全操作 |
| **能否访问数据库** | ✅ 可以 (需要权限配置) | ✅ 可以 (完全控制) |
| **能否定时运行** | ❌ 不能 | ✅ 可以 (定时触发) |
| **性能** | 受手机性能限制 | 服务器性能，无限制 |
| **安全性** | 代码暴露在客户端 | 代码隐藏在服务器 |
| **用户看得到吗** | ✅ 看得到 (UI和逻辑) | ❌ 看不到 (后台运行) |

---

## 🔗 具体的调用关系

### 在小程序中如何调用云函数

**方式1: 直接调用云函数**

```javascript
// miniprogram/pages/index/index.js
wx.cloud.callFunction({
  name: 'login',  // 云函数名称
  data: {},
  success: res => {
    console.log('登录成功:', res.result.openid);
  }
});
```

**方式2: 通过API封装调用**

```javascript
// miniprogram/utils/api.js
const getUserOrCreate = async (openid, userInfo) => {
  const db = wx.cloud.database();
  // 直接操作数据库，不需要调用云函数
  const result = await db.collection('users').doc(openid).get();
  return result.data;
};

// miniprogram/pages/index/index.js
import api from '../../utils/api.js';

api.getUserOrCreate(openid, userInfo).then(user => {
  console.log('用户信息:', user);
});
```

---

## 🎯 何时用miniprogram，何时用cloudfunctions

### 用miniprogram做:
- ✅ 显示UI页面
- ✅ 收集用户输入
- ✅ 简单的数据验证
- ✅ 显示数据

### 用cloudfunctions做:
- ✅ **复杂的排名计算** (需要遍历所有比赛、排序等)
- ✅ **定时任务** (赛季推进、排名更新)
- ✅ **安全的数据操作** (不能在客户端暴露)
- ✅ **多表事务处理** (同时更新多个集合)

---

## 💡 在我们的项目中

### miniprogram做了什么:
```javascript
// 1. 显示Group列表 (pages/index/index.js)
// 2. 显示排名表格 (pages/group/detail.js)
// 3. 上传比赛表单 (pages/match/upload-singles.js)
// 4. 审核比赛 (pages/group/detail.js)

// 都是UI层面的工作
```

### cloudfunctions做了什么:
```javascript
// 1. 计算排名 (cloudfunctions/updateRankings)
//    - 遍历所有比赛
//    - 计算胜负和最近5场胜率
//    - 排序生成排名
//    - 每30分钟自动运行

// 2. 赛季推进 (cloudfunctions/progressSeason)
//    - 检查赛季开始时间
//    - 状态转换 pending→active→ended→settled
//    - 自动计算赛季奖项
//    - 每天凌晨2点自动运行

// 都是后台处理工作
```

---

## 🚀 实际工作流程

### 用户完整流程:

```
1. 打开小程序 (miniprogram/app.js 初始化)
            ↓
2. 微信登录 (调用 cloudfunctions/login)
            ↓
3. 查看Group列表 (miniprogram 显示 users 和 groups 数据)
            ↓
4. 进入某个Group (miniprogram 显示排名)
            ↓
5. 上传比赛 (miniprogram 收集数据 → 保存到 matches 集合)
            ↓
6. 对手审核 (miniprogram 审核 → 更新 matches 状态为 approved)
            ↓
7. [30分钟后] cloudfunctions/updateRankings 自动运行
            ↓
8. 用户刷新排名页 (miniprogram 显示已更新的排名)
```

---

## 📝 文件对应关系

| 功能 | miniprogram文件 | cloudfunctions文件 | 数据库集合 |
|------|---------------|------------------|----------|
| 用户登录 | pages/auth/login.js | login/ | users |
| Group管理 | pages/group/detail.js | (无) | groups, group_members |
| 比赛上传 | pages/match/upload-singles.js | (无) | matches |
| 排名计算 | pages/group/detail.js显示 | **updateRankings/** | season_rankings |
| 赛季推进 | (无，后台) | **progressSeason/** | seasons, season_awards |

---

## ✅ 总结

**miniprogram** = 用户界面和交互
**cloudfunctions** = 后台业务逻辑和定时任务

它们通过 **CloudBase** 连接在一起，小程序通过API调用云函数或直接操作数据库。

**类比**:
- miniprogram = 电影的前台 (演员、舞台)
- cloudfunctions = 电影的后台 (导演、编剧、技术人员)
- CloudBase = 电影的基础设施 (舞台、灯光、音响)
