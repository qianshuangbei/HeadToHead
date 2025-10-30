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
    const pages = getCurrentPages();
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null;
    this.previousRoute = prevPage ? prevPage.route : '';

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
        this.setData({
          seasons,
          currentSeasonIndex: 0
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
        this.setData({ recentMatches: res.data });
      })
      .catch(err => {
        console.error('Failed to load recent matches:', err);
      });
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
    const app = getApp();
    const creatorId = this.data.group.creator_id;
    if (app.globalData.openid !== creatorId) {
      wx.showToast({ title: '仅创建者可创建赛季', icon: 'error' });
      return;
    }
    wx.navigateTo({
      url: `/pages/season/create?groupId=${this.data.groupId}`
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
