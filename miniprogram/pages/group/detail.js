/**pages/group/detail.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    groupId: '',
    group: {},
    activeTab: 'ranking',
    rankings: [],
    seasons: [],
    currentSeasonIndex: 0,
    pendingMatches: [],
    recentMatches: [],
  },

  onLoad(options) {
    this.setData({ groupId: options.groupId });
    this.loadGroupDetail();
    this.loadSeasons();
    this.loadRankings();
    this.loadMatches();
  },

  onShow() {
    this.loadGroupDetail();
    this.loadMatches();
  },

  // 加载Group详情
  loadGroupDetail() {
    api.getGroupDetail(this.data.groupId)
      .then(group => {
        this.setData({ group });
      })
      .catch(err => {
        console.error('加载Group详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      });
  },

  // 加载赛季
  loadSeasons() {
    api.getGroupSeasons(this.data.groupId)
      .then(seasons => {
        this.setData({
          seasons,
          currentSeasonIndex: 0
        });
        if (seasons.length > 0) {
          this.loadRankings();
        }
      })
      .catch(err => {
        console.error('加载赛季失败:', err);
      });
  },

  // 加载排名
  loadRankings() {
    const currentSeason = this.data.seasons[this.data.currentSeasonIndex];
    if (!currentSeason) return;

    api.getSeasonRankings(currentSeason._id)
      .then(rankings => {
        // 补充玩家名称
        const db = api.initCloudBase();
        const userIds = rankings.map(r => r.user_id);

        db.collection('users')
          .where({ _id: db.command.in(userIds) })
          .get()
          .then(res => {
            const users = res.data;
            const rankingsWithNames = rankings.map(r => ({
              ...r,
              playerName: users.find(u => u._id === r.user_id)?.nickname || '未知玩家'
            }));
            this.setData({ rankings: rankingsWithNames });
          });
      })
      .catch(err => {
        console.error('加载排名失败:', err);
      });
  },

  // 加载比赛
  loadMatches() {
    const app = getApp();
    const db = api.initCloudBase();

    // 获取待审核比赛
    api.getPendingMatches(app.globalData.openid, this.data.groupId)
      .then(matches => {
        // 补充对手信息
        const opponentIds = matches.map(m => m.player_a_id);
        return db.collection('users')
          .where({ _id: db.command.in(opponentIds) })
          .get()
          .then(res => {
            const users = res.data;
            const matchesWithNames = matches.map(m => ({
              ...m,
              opponentName: users.find(u => u._id === m.player_a_id)?.nickname || '未知玩家'
            }));
            this.setData({ pendingMatches: matchesWithNames });
          });
      })
      .catch(err => {
        console.error('加载待审核比赛失败:', err);
      });

    // 获取最近比赛
    db.collection('matches')
      .where({
        group_id: this.data.groupId,
        status: db.command.neq('pending')
      })
      .orderBy('created_at', 'desc')
      .limit(10)
      .get()
      .then(res => {
        this.setData({ recentMatches: res.data });
      })
      .catch(err => {
        console.error('加载最近比赛失败:', err);
      });
  },

  // 切换标签
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // 赛季切换
  onSeasonChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ currentSeasonIndex: index });
    this.loadRankings();
  },

  // 复制分享码
  copyAccessCode() {
    wx.setClipboardData({
      data: this.data.group.access_code,
      success: () => {
        wx.showToast({
          title: '已复制分享码',
          icon: 'success'
        });
      }
    });
  },

  // 审核比赛
  approveMatch(e) {
    const matchId = e.currentTarget.dataset.matchId;
    const app = getApp();

    api.approveSinglesMatch(matchId, app.globalData.openid, true)
      .then(() => {
        wx.showToast({
          title: '审核通过',
          icon: 'success'
        });
        this.loadMatches();
        this.loadRankings();
      })
      .catch(err => {
        console.error('审核失败:', err);
        wx.showToast({
          title: err.message || '审核失败',
          icon: 'error'
        });
      });
  },

  // 拒绝比赛
  rejectMatch(e) {
    const matchId = e.currentTarget.dataset.matchId;
    const app = getApp();

    api.approveSinglesMatch(matchId, app.globalData.openid, false)
      .then(() => {
        wx.showToast({
          title: '已拒绝',
          icon: 'success'
        });
        this.loadMatches();
      })
      .catch(err => {
        console.error('拒绝失败:', err);
      });
  },

  // 上传单打
  handleUploadSingles() {
    wx.navigateTo({
      url: `/pages/match/upload-singles?groupId=${this.data.groupId}`
    });
  },

  // 上传双打
  handleUploadDoubles() {
    wx.navigateTo({
      url: `/pages/match/upload-doubles?groupId=${this.data.groupId}`
    });
  },

  // 退出Group
  handleLeaveGroup() {
    wx.showModal({
      title: '确认退出',
      content: '确认要退出该Group吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已退出',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
        }
      }
    });
  }
});

// 自定义过滤器
Page.prototype.formatRate = function(value) {
  if (!value) return '0%';
  return (value * 100).toFixed(1) + '%';
};
