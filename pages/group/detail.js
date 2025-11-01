/**pages/group/detail.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    openid: '',
    groupId: '',
    group: {},
    activeTab: 'ranking',
    rankings: [],
    seasons: [],
    currentSeasonIndex: 0,
    pendingMatches: [],
    recentMatches: [],
    members: []
  },

  onLoad(options) {
    const app = getApp();
    const openid = app.globalData.openid;
    const pages = getCurrentPages();
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null;
    this.previousRoute = prevPage ? prevPage.route : '';

    this.setData({ groupId: options.groupId, openid: openid });
    this.loadGroupDetail();
    this.loadSeasons();
    this.loadRankings();
    this.loadMatches();
    this.loadMembers();
  },

  onShow() {
    this.loadGroupDetail();
    this.loadSeasons();
    this.loadMatches();
    this.loadMembers();
  },

  // Load group details
  loadGroupDetail() {
    api.getGroupDetail(this.data.groupId)
      .then(group => {
        this.setData({ group: group[0] });
      })
      .catch(err => {
        console.error('Failed to load group details:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      });
  },

  // Load seasons
  loadSeasons() {
    api.getGroupSeasons(this.data.groupId)
      .then(seasons => {
        // 找出 status 为 'active' 的 season 索引
        const activeIndex = seasons.findIndex(s => s.status === 'active');
        const currentSeasonIndex = activeIndex >= 0 ? activeIndex : 0;

        this.setData({
          seasons,
          currentSeasonIndex
        });
        if (seasons.length > 0) {
          this.loadRankings();
        }
      })
      .catch(err => {
        console.error('Failed to load seasons:', err);
      });
  },

  // Load rankings
  loadRankings() {
    const currentSeason = this.data.seasons[this.data.currentSeasonIndex];
    if (!currentSeason) return;

    api.getSeasonRankings(currentSeason._id)
      .then(rankings => {
        // Enrich with player names
        const db = api.initCloudBase();
        const userIds = rankings.map(r => r.user_id);

        db.collection('users')
          .where({ _id: db.command.in(userIds) })
          .get()
          .then(res => {
            const users = res.data;
            const rankingsWithNames = rankings.map(r => ({
              ...r,
              playerName: users.find(u => u._id === r.user_id)?.nickname || 'Unknown Player'
            }));
            this.setData({ rankings: rankingsWithNames });
          });
      })
      .catch(err => {
        console.error('Failed to load rankings:', err);
      });
  },

  // Load matches
  loadMatches() {
    const app = getApp();
    const db = api.initCloudBase();

    // Fetch pending matches for review
    api.getPendingMatches(app.globalData.openid, this.data.groupId)
      .then(matches => {
        // Enrich with opponent names
        const opponentIds = matches.map(m => m.player_a_id);
        return db.collection('users')
          .where({ _id: db.command.in(opponentIds) })
          .get()
          .then(res => {
            const users = res.data;
            const matchesWithNames = matches.map(m => ({
              ...m,
              opponentName: users.find(u => u._id === m.player_a_id)?.nickname || 'Unknown Player'
            }));
            this.setData({ pendingMatches: matchesWithNames });
          });
      })
      .catch(err => {
        console.error('Failed to load pending matches:', err);
      });

    // Fetch recent matches
    db.collection('matches')
      .where({
        group_id: this.data.groupId,
        status: db.command.neq('pending')
      })
      .orderBy('created_at', 'desc')
      .limit(10)
      .get()
      .then(res => {
        var matches = res.data;
        const opponentIds = matches.map(m => m.player_a_id);
        db.collection('users')
          .where({ _openid: db.command.in(opponentIds) })
          .get()
          .then(res => {
            const users = res.data;
            const matchesWithNames = matches.map(m => ({
              ...m,
              player_a_name: users.find(u => u._openid === m.player_a_id)?.nickname || 'Unknown Player',
              player_b_name: users.find(u => u._openid === m.player_b_id)?.nickname || 'Unknown Player'
            }));
            this.setData({ recentMatches: matchesWithNames });
          });
      })
      .catch(err => {
        console.error('Failed to load recent matches:', err);
      });
  },

  // Load members
  async loadMembers() {
    const creatorId = this.data.group.creator_id;

    try {
      // 使用 API 函数，它会自动转换头像 URL
      const membersData = await api.getGroupMembers(this.data.groupId);

      // 标记创建者
      const members = membersData.map(member => ({
        display_avatar: member.display_avatar,
        nickname: member.nickname,
        _openid: member.openid,
        isCreator: member.openid === creatorId
      }));

      this.setData({ members });
    } catch (err) {
      console.error('Failed to load members:', err);
      wx.showToast({
        title: '加载成员失败',
        icon: 'error'
      });
    }
  },

  // Switch tabs
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // Season selector
  onSeasonChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ currentSeasonIndex: index });
    this.loadRankings();
  },

  // Copy access code
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

  // Approve match
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
        console.error('Failed to approve match:', err);
        wx.showToast({
          title: err.message || '审核失败',
          icon: 'error'
        });
      });
  },

  // Reject match
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
        console.error('Failed to reject match:', err);
      });
  },

  // Upload match
  handleUploadMatch() {
    wx.navigateTo({
      url: `/pages/match/upload-match?groupId=${this.data.groupId}`
    });
  },

  // Navigate to create season page (creator only)
  handleCreateSeason() {
    wx.showModal({
      title: '创建新赛季',
      content: '创建新赛季将终止当前赛季，确认要继续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/season/create?groupId=${this.data.groupId}`
          });
        }
      }
    });
  },

  // Leave group
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
            wx.redirectTo({ url: '/pages/group/list' });
          }, 500);
        }
      }
    });
  },

  handleBack() {
    wx.redirectTo({ url: '/pages/group/list' });
  }
});

// Format win rate percentage
Page.prototype.formatRate = function(value) {
  if (!value) return '0%';
  return (value * 100).toFixed(1) + '%';
};
