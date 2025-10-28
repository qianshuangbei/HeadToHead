/**pages/group/create.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    formData: {
      name: '',
      seasonEnabled: true,
      seasonName: '',
      startDate: '',
      endDate: ''
    },
    loading: false
  },

  onLoad() {
    // Set default dates
    const today = new Date();
    const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months later

    this.setData({
      'formData.startDate': this.formatDate(today),
      'formData.endDate': this.formatDate(endDate)
    });
  },

  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
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

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  handleCreate() {
    const form = this.data.formData;

    // Auto set season name if empty
    if (!form.seasonName) {
      const today = new Date();
      this.setData({ 'formData.seasonName': `${today.getFullYear()}赛季` });
    }

    // Validation
    if (!form.name.trim()) {
      wx.showToast({
        title: '请输入Group名称',
        icon: 'error'
      });
      return;
    }


    this.setData({ loading: true });

    const app = getApp();
    const groupData = {
      name: form.name,
      season_enabled: form.seasonEnabled
    };

    // Create group
    api.createGroup(app.globalData.openid, groupData)
      .then(group => {
        // If season enabled, create season
        if (true) {
          const startTime = new Date(form.startDate).getTime();
          const endTime = new Date(form.endDate).getTime();

          return api.createSeason(
            group._id,
            form.seasonName,
            startTime,
            endTime
          ).then(() => group);
        }
        return group;
      })
      .then(group => {
        wx.showToast({
          title: '创建成功！已自动开启赛季',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/group/detail?groupId=${group._id}`
          });
        }, 500);
      })
      .catch(err => {
        console.error('Failed to create group:', err);
        wx.showToast({
          title: '创建失败',
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
