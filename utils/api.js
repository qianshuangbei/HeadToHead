/**
 * CloudBase 初始化和API封装
 * 类型与构造在 utils/models.js
 */
const { buildUser, buildGroup } = require('./models.js');
let db = null;

const initCloudBase = () => {
  if (!db) {
    db = wx.cloud.database({
      throwOnNotFound: false,
    });
  }
  return db;
};

/**
 * ==================== 用户相关 ====================
 */

// 通用文档创建封装：统一使用 add({ data: doc })
const addDoc = async (collectionName, doc) => {
  const db = initCloudBase();
  return db.collection(collectionName).add({ data: doc });
};

// 通用文档更新封装：统一使用 update({ data: partial })
const updateDoc = async (collectionName, docId, partial) => {
  const db = initCloudBase();
  return db.collection(collectionName).where({ _openid: docId}).update({ data: partial });
};

// 通过 _id 更新文档
const updateDocById = async (collectionName, docId, partial) => {
  const db = initCloudBase();
  return db.collection(collectionName).where({ _id: docId }).update({ data: partial });
};

// 使用外部 buildUser / buildGroup (见 models.js)

// 获取或创建用户
const getUserOrCreate = async (openid, userInfo) => {
  const db = initCloudBase();

  // 查询是否已有用户
  const queryRes = await db.collection('users').where({ _openid: openid }).get();
  if (queryRes.data && queryRes.data.length > 0) {
    return queryRes.data;
  }

  // 未找到则创建
  const newUser = buildUser(userInfo.nickName, userInfo.avatarUrl);

  const addRes = await addDoc('users', newUser);
  return { ...newUser, _id: addRes._id };
};

// 更新用户信息
// 更新用户信息（如果传入 completed_profile=true 则也更新展示昵称/头像）
const updateUserInfo = async (openid, userData) => {
  return updateDoc('users', openid, {
    ...userData,
    updated_at: Date.now(),
  });
};

/**
 * ==================== Group相关 ====================
 */

// 生成 GUID (UUID v4)
const generateGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 生成分享码 (6位字母数字)
const generateAccessCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 创建Group
const createGroup = async (creatorId, groupData) => {
  const db = initCloudBase();
  var group_id = generateGuid();
  const newGroup = buildGroup(
    groupData.name,
    groupData.description,
    group_id,
    creatorId,
    groupData.season_enabled,
    generateAccessCode()
  );

  const result = await addDoc('groups', newGroup);

  // 同时添加创建者为成员
  await addDoc('group_members', {
      group_id: group_id,
      user_id: creatorId,
      joined_at: Date.now(),
      role: 'creator',
      is_active: true,
    });

  return { ...newGroup};
};

// 通过分享码加入Group
const joinGroupByCode = async (userId, accessCode) => {
  const db = initCloudBase();

  // 查找Group
  const groupResult = await db.collection('groups')
    .where({ access_code: accessCode })
    .get();

  if (groupResult.data.length === 0) {
    throw new Error('分享码不存在');
  }

  const group = groupResult.data[0];

  // 检查是否已经是成员
  const memberResult = await db.collection('group_members')
    .where({
      group_id: group.group_id,
      user_id: userId,
      is_active: true,
    })
    .get();

  if (memberResult.data.length > 0) {
    throw new Error('您已是该Group的成员');
  }

  // 添加为成员
  await addDoc('group_members', {
      group_id: group.group_id,
      user_id: userId,
      joined_at: Date.now(),
      role: 'member',
      is_active: true,
    });

  // 更新Group的成员数
  await updateDoc('groups', group._openid, {
      member_count: db.command.inc(1),
      updated_at: Date.now(),
    });

  return group;
};

// 获取用户的所有Group
const getUserGroups = async (userId) => {
  const db = initCloudBase();

  const memberResult = await db.collection('group_members')
    .where({
      user_id: userId,
      is_active: true,
    })
    .get();

  const groupIds = memberResult.data.map(m => m.group_id);

  if (groupIds.length === 0) return [];

  const groupResult = await db.collection('groups')
    .where({
      group_id: db.command.in(groupIds)
    })
    .get();

  return groupResult.data;
};

const getGroupMembers = async (groupId) => {
  const db = initCloudBase();
  // 获取所有成员
  const members = await db.collection('group_members')
    .where({
      group_id: groupId,
      is_active: true,
    })
    .get();
  const memberIds = members.data.map(m => m.user_id);

  // 获取成员的完整用户信息
  if (memberIds.length === 0) {
    return [];
  }

  const users = await db.collection('users')
    .where({
      _openid: db.command.in(memberIds)
    })
    .get();

  // 收集所有需要转换的 cloud:// fileID
  const fileIDs = users.data
    .map(user => user.display_avatar)
    .filter(avatar => avatar && avatar.startsWith('cloud://'));

  // 批量转换为临时 URL
  const urlMap = await convertFileIDsToUrls(fileIDs);

  // 返回包含 openid, display_avatar, nickname 的用户信息
  return users.data.map(user => ({
    user_id: user._openid,
    openid: user._openid,
    display_avatar: user.display_avatar && user.display_avatar.startsWith('cloud://')
      ? (urlMap[user.display_avatar] || user.display_avatar)
      : user.display_avatar,
    nickname: user.nickname
  }));
}

// 获取Group详情(包含成员)
const getGroupDetail = async (groupId) => {
  const db = initCloudBase();

  const group = await db.collection('groups').where({group_id: groupId}).get();

  if (!group.data) {
    throw new Error('Group不存在');
  }

  // 获取所有成员
  const members = await db.collection('group_members')
    .where({
      group_id: groupId,
      is_active: true,
    })
    .get();

  // 获取成员详细信息
  const memberIds = members.data.map(m => m.user_id);
  const usersResult = await db.collection('users')
    .where({
      _openid: db.command.in(memberIds)
    })
    .get();

  // 收集所有需要转换的 cloud:// fileID
  const fileIDs = usersResult.data
    .map(user => user.display_avatar)
    .filter(avatar => avatar && avatar.startsWith('cloud://'));

  // 批量转换为临时 URL
  const urlMap = await convertFileIDsToUrls(fileIDs);

  // 转换用户头像 URL
  const usersWithUrls = usersResult.data.map(user => ({
    ...user,
    display_avatar: user.display_avatar && user.display_avatar.startsWith('cloud://')
      ? (urlMap[user.display_avatar] || user.display_avatar)
      : user.display_avatar
  }));

  return {
    ...group.data,
    members: members.data.map(m => ({
      ...m,
      userInfo: usersWithUrls.find(u => u._openid === m.user_id) || {}
    }))
  };
};

/**
 * ==================== 比赛相关 ====================
 */

// 创建单打比赛 (扩展支持 format 与单盘比分结构)
const createSinglesMatch = async (groupId, seasonId, creatorId, opponentId, score, format) => {
  // 兼容：如果只传入 set1 则仍按原逻辑计算；支持仅单盘
  let winnerAScore = score.set1.player_a + (score.set2?.player_a || 0) + (score.set3?.player_a || 0);
  let winnerBScore = score.set1.player_b + (score.set2?.player_b || 0) + (score.set3?.player_b || 0);

  const newMatch = {
    match_type: 'singles', // 与比赛形式 format 区分
    group_id: groupId,
    season_id: seasonId,
    player_a_id: creatorId,
    player_b_id: opponentId,
    score: score,
    format: format || '', // 新增比赛形式字段：6_games / 4_games / tb7 / tb10 / tb11
    winning_player_id: winnerAScore > winnerBScore ? creatorId : opponentId,
    status: 'pending',
    created_by: creatorId,
    created_at: Date.now(),
    approved_by: '',
    approved_at: 0,
    tags: [],
  };

  const result = await addDoc('matches', newMatch);
  return { ...newMatch, _id: result._id };
};

// 创建双打比赛
const createDoublesMatch = async (groupId, seasonId, creatorId, teamA, teamB, score) => {

  let teamAScore = score.set1.team_a + (score.set2?.team_a || 0) + (score.set3?.team_a || 0);
  let teamBScore = score.set1.team_b + (score.set2?.team_b || 0) + (score.set3?.team_b || 0);

  const newMatch = {
    match_type: 'doubles',
    group_id: groupId,
    season_id: seasonId,
    team_a: teamA,
    team_b: teamB,
    score: score,
    winning_team: teamAScore > teamBScore ? 'team_a' : 'team_b',
    status: 'pending',
    created_by: creatorId,
    created_at: Date.now(),
    approvals: [
      { user_id: teamA.player1, status: 'pending', approved_at: 0 },
      { user_id: teamA.player2, status: 'pending', approved_at: 0 },
      { user_id: teamB.player1, status: 'pending', approved_at: 0 },
      { user_id: teamB.player2, status: 'pending', approved_at: 0 },
    ],
  };

  const result = await addDoc('matches', newMatch);
  return { ...newMatch, _id: result._id };
};

// 审核单打比赛
const approveSinglesMatch = async (matchId, approverId, approved) => {
  const db = initCloudBase();

  const match = await db.collection('matches').doc(matchId).get();

  if (!match.data) {
    throw new Error('比赛不存在');
  }

  if (match.data.match_type !== 'singles') {
    throw new Error('这不是单打比赛');
  }

  if (match.data.status !== 'pending') {
    throw new Error('比赛已审核');
  }

  await updateDocById('matches', matchId, {
      status: approved ? 'approved' : 'rejected',
      approved_by: approverId,
      approved_at: Date.now(),
    });

  return match.data;
};

// 获取待审核比赛列表
const getPendingMatches = async (userId, groupId) => {
  const db = initCloudBase();

  const result = await db.collection('matches')
    .where({
      group_id: groupId,
      status: 'pending',
      player_b_id: userId, // 作为被审核人
    })
    .orderBy('created_at', 'desc')
    .get();

  return result.data;
};

/**
 * ==================== 排名相关 ====================
 */

// 获取赛季排名
const getSeasonRankings = async (seasonId) => {
  const db = initCloudBase();

  const result = await db.collection('season_rankings')
    .where({
      season_id: seasonId
    })
    .orderBy('rank', 'asc')
    .get();

  return result.data;
};

// 获取当前排名(如果没有赛季，则获取总排名)
const getCurrentRanking = async (groupId) => {
  const db = initCloudBase();

  // 查找当前活跃赛季
  const seasonResult = await db.collection('seasons')
    .where({
      group_id: groupId,
      status: 'active'
    })
    .limit(1)
    .get();

  if (seasonResult.data.length > 0) {
    return getSeasonRankings(seasonResult.data[0]._id);
  }

  return [];
};

/**
 * ==================== 云存储相关 ====================
 */

// 将 cloud:// fileID 转换为临时访问 URL
const convertFileIDsToUrls = async (fileIDs) => {
  if (!fileIDs || fileIDs.length === 0) return {};

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: fileIDs,
    });

    // 返回 fileID -> tempFileURL 的映射
    const urlMap = {};
    res.fileList.forEach(file => {
      if (file.tempFileURL) {
        urlMap[file.fileID] = file.tempFileURL;
      }
    });
    return urlMap;
  } catch (e) {
    console.error('Convert fileIDs to URLs failed:', e);
    return {};
  }
};

/**
 * ==================== 赛季相关 ====================
 */

// 创建赛季
const createSeason = async (groupId, seasonName, startDate, endDate) => {
  var season_id = generateGuid();
  const newSeason = {
    group_id: groupId,
    season_id: season_id,
    season_name: seasonName,
    status: 'active',
    start_date: startDate,
    end_date: endDate,
    duration_days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
    match_count: 0,
    participant_count: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const result = await addDoc('seasons', newSeason);

  // 更新Group的当前赛季
  await updateDoc('groups', groupId, {
      current_season_id: season_id,
      updated_at: Date.now(),
    });

  return { ...newSeason, _id: season_id };
};

// 获取Group的所有赛季
const getGroupSeasons = async (groupId) => {
  const db = initCloudBase();

  const result = await db.collection('seasons')
    .where({
      group_id: groupId
    })
    .orderBy('created_at', 'desc')
    .get();

  return result.data;
};


module.exports = {
  initCloudBase,
  getUserOrCreate,
  updateUserInfo,
  createGroup,
  joinGroupByCode,
  getUserGroups,
  getGroupDetail,
  getGroupMembers,
  createSinglesMatch,
  createDoublesMatch,
  approveSinglesMatch,
  getPendingMatches,
  getSeasonRankings,
  getCurrentRanking,
  createSeason,
  getGroupSeasons,
};
