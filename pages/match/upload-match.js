/**pages/match/upload-singles.js*/
const api = require('../../utils/api.js');
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    groupId: '',
    seasonId: '',
    self_id: '',
    // Match type selector
    matchTypeOptions: [
      { value: 'singles', label: '单打' },
      { value: 'doubles', label: '双打' }
    ],
    selectedMatchTypeIndex: 0,
    selectedMatchType: 'singles',
    // Current user info
    currentUser: null,
    opponents: [],
    selectedOpponentIndex: 0,
    selectedOpponent: null,
    // Doubles mode players
    playerB: null,  // 队友
    playerC: null,  // 对手1
    playerD: null,  // 对手2
    playerBIndex: 0,
    playerCIndex: 0,
    playerDIndex: 0,
    // Simplified single-score inputs
    score_a: '',
    score_b: '',
    // Match format (distinct from match_type singles/doubles)
    formatOptions: [
      { value: '6_games', label: '6局' },
      { value: '4_games', label: '4局' },
      { value: 'tb7', label: '抢7' },
      { value: 'tb10', label: '抢10' },
      { value: 'tb11', label: '抢11' },
    ],
    selectedFormatIndex: 0,
    selectedFormat: '6_games',
    matchDate: '',
    tags: [],
    loading: false
  },

  onLoad(options) {
    this.setData({ groupId: options.groupId });
    this.setDefaultDate();
    this.loadCurrentUser();
    this.loadOpponents();
    this.loadSeason();
  },

  setDefaultDate() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ matchDate: dateStr });
  },

  loadCurrentUser() {
    const app = getApp();
    this.setData({self_id: app.globalData.openid});
  },

  loadOpponents() {
    api.getGroupMembers(this.data.groupId)
      .then(members => {
        const opponents = members.filter(m != this.data.self_id);
        this.setData({
          opponents: opponents,
          selectedOpponent: opponents.length > 0 ? opponents[0] : null
        });
      })
      .catch(err => {
        console.error('Failed to load opponents:', err);
        wx.showToast({ title: i18n.t('loadOpponentsFailed'), icon: 'error' });
      });
  },

  loadSeason() {
    const db = api.initCloudBase();

    // First, get the current season and end it
    db.collection('groups')
      .where({ group_id: this.data.groupId })
      .get()
      .then(groupRes => {
          this.setData({ seasonId: groupRes.data[0].current_season_id });
      })
      .catch(err => {
        console.error('Failed to load season:', err);
        wx.showToast({ title: i18n.t('loadSeasonFailed'), icon: 'error' });
      });
  },

  onMatchTypeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedMatchTypeIndex: index,
      selectedMatchType: this.data.matchTypeOptions[index].value
    });
  },

  onOpponentChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedOpponentIndex: index,
      selectedOpponent: this.data.opponents[index]
    });
  },

  // 双打模式玩家选择
  onPlayerBChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      playerBIndex: index,
      playerB: this.data.opponents[index]
    });
  },

  onPlayerCChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      playerCIndex: index,
      playerC: this.data.opponents[index]
    });
  },

  onPlayerDChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      playerDIndex: index,
      playerD: this.data.opponents[index]
    });
  },

  onScoreAInput(e) {
    this.setData({ score_a: e.detail.value });
  },

  onScoreBInput(e) {
    this.setData({ score_b: e.detail.value });
  },

  onFormatChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedFormatIndex: index,
      selectedFormat: this.data.formatOptions[index].value
    });
  },

  onDateChange(e) {
    this.setData({ matchDate: e.detail.value });
  },

  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = this.data.tags;
    const idx = tags.indexOf(tag);
    if (idx > -1) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.setData({ tags });
  },

  handleUpload() {
    if (!this.data.selectedOpponent) {
      wx.showToast({ title: i18n.t('selectOpponent'), icon: 'error' });
      return;
    }
    if (this.data.score_a === '' || this.data.score_b === '') {
      wx.showToast({ title: i18n.t('enterScore'), icon: 'error' });
      return;
    }

    this.setData({ loading: true });

    const app = getApp();
    const score = {
      set1: {
        player_a: parseInt(this.data.score_a, 10) || 0,
        player_b: parseInt(this.data.score_b, 10) || 0,
      }
    };

    api.createSinglesMatch(
      this.data.groupId,
      this.data.seasonId,
      app.globalData.openid,
      this.data.selectedOpponent.user_id,
      score,
      this.data.selectedFormat
    )
      .then(() => {
        wx.showToast({ title: i18n.t('uploadSuccess'), icon: 'success' });
        setTimeout(() => { wx.navigateBack(); }, 500);
      })
      .catch(err => {
        console.error('Failed to upload match:', err);
        wx.showToast({ title: i18n.t('uploadFailed'), icon: 'error' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleCancel() {
    wx.navigateBack();
  }
});
