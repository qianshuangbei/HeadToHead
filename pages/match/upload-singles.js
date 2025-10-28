/**pages/match/upload-singles.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    groupId: '',
    seasonId: '',
    opponents: [],
    selectedOpponentIndex: 0,
    selectedOpponent: null,
    score: {
      set1: { player_a: '', player_b: '' },
      set2: { player_a: '', player_b: '' },
      set3: { player_a: '', player_b: '' }
    },
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
        // Filter out self
        const opponents = group.members.filter(m => m.user_id !== app.globalData.openid);
        this.setData({
          opponents,
          selectedOpponent: opponents.length > 0 ? opponents[0] : null
        });
      })
      .catch(err => {
        console.error('Failed to load opponents:', err);
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
      });
  },

  onOpponentChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedOpponentIndex: index,
      selectedOpponent: this.data.opponents[index]
    });
  },

  onSet1PlayerAInput(e) {
    this.setData({ 'score.set1.player_a': parseInt(e.detail.value) || 0 });
  },

  onSet1PlayerBInput(e) {
    this.setData({ 'score.set1.player_b': parseInt(e.detail.value) || 0 });
  },

  onSet2PlayerAInput(e) {
    this.setData({ 'score.set2.player_a': parseInt(e.detail.value) || 0 });
  },

  onSet2PlayerBInput(e) {
    this.setData({ 'score.set2.player_b': parseInt(e.detail.value) || 0 });
  },

  onSet3PlayerAInput(e) {
    this.setData({ 'score.set3.player_a': parseInt(e.detail.value) || 0 });
  },

  onSet3PlayerBInput(e) {
    this.setData({ 'score.set3.player_b': parseInt(e.detail.value) || 0 });
  },

  onDateChange(e) {
    this.setData({ matchDate: e.detail.value });
  },

  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = this.data.tags;
    const index = tags.indexOf(tag);

    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(tag);
    }

    this.setData({ tags });
  },

  handleUpload() {
    // Validation
    if (!this.data.selectedOpponent) {
      wx.showToast({ title: '请选择对手', icon: 'error' });
      return;
    }

    if (!this.data.score.set1.player_a || !this.data.score.set1.player_b) {
      wx.showToast({ title: '请输入第一盘比分', icon: 'error' });
      return;
    }

    if (!this.data.score.set2.player_a || !this.data.score.set2.player_b) {
      wx.showToast({ title: '请输入第二盘比分', icon: 'error' });
      return;
    }

    this.setData({ loading: true });

    const app = getApp();
    const score = {
      set1: this.data.score.set1,
      set2: this.data.score.set2
    };

    if (this.data.score.set3.player_a || this.data.score.set3.player_b) {
      score.set3 = this.data.score.set3;
    }

    api.createSinglesMatch(
      this.data.groupId,
      this.data.seasonId,
      app.globalData.openid,
      this.data.selectedOpponent.user_id,
      score
    )
      .then(() => {
        wx.showToast({
          title: '上传成功！',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 500);
      })
      .catch(err => {
        console.error('Failed to upload match:', err);
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleCancel() {
    wx.navigateBack();
  }
});
