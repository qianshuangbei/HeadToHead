// pages/season/create.js
const api = require('../../utils/api.js');

Page({
  data: {
    formData: {
      seasonName: '',
      startDate: '',
      endDate: ''
    },
    loading: false,
    groupId: ''
  },

  onLoad(options) {
    const groupId = options.groupId || '';
    const today = new Date();
    const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    this.setData({
      groupId,
      'formData.startDate': this.formatDate(today),
      'formData.endDate': this.formatDate(endDate),
      'formData.seasonName': `${today.getFullYear()}赛季`
    });
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  },

  onSeasonNameInput(e) {
    this.setData({ 'formData.seasonName': e.detail.value });
  },

  onStartDateChange(e) {
    this.setData({ 'formData.startDate': e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ 'formData.endDate': e.detail.value });
  },

  handleCreate() {
    const { seasonName, startDate, endDate } = this.data.formData;
    if (!seasonName.trim()) {
      wx.showToast({ title: '请输入赛季名称', icon: 'error' });
      return;
    }
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期', icon: 'error' });
      return;
    }

    this.setData({ loading: true });

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();

    api.createSeason(this.data.groupId, seasonName, startTs, endTs)
      .then(season => {
        wx.showToast({ title: '赛季创建成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 500);
      })
      .catch(err => {
        console.error('Failed to create season:', err);
        wx.showToast({ title: '创建失败', icon: 'error' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleCancel() {
    wx.navigateBack();
  }
});
