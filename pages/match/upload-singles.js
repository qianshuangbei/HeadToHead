/**pages/match/upload-singles.js*/
const api = require('../../utils/api.js');
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    groupId: '',
    seasonId: '',
    opponents: [],
    selectedOpponentIndex: 0,
    selectedOpponent: null,
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
    this.loadOpponents();
    this.loadSeason();
  },

  setDefaultDate() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ matchDate: dateStr });
  },

  loadOpponents() {
    const app = getApp();
    api.getGroupDetail(this.data.groupId)
      .then(group => {
        const opponents = group.members.filter(m => m.user_id !== app.globalData.openid);
        this.setData({
          opponents,
          selectedOpponent: opponents.length > 0 ? opponents[0] : null
        });
      })
      .catch(err => {
        console.error('Failed to load opponents:', err);
        wx.showToast({ title: i18n.t('loadOpponentsFailed'), icon: 'error' });
      });
  },

  loadSeason() {
    api.getGroupSeasons(this.data.groupId)
      .then(seasons => {
        const activeSeason = seasons.find(s => s.status === 'active');
        if (activeSeason) {
          this.setData({ seasonId: activeSeason._id });
        }
      })
      .catch(err => {
        console.error('Failed to load season:', err);
        wx.showToast({ title: i18n.t('loadSeasonFailed'), icon: 'error' });
      });
  },

  onOpponentChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedOpponentIndex: index,
      selectedOpponent: this.data.opponents[index]
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
