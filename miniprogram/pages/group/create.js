/**pages/group/create.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    formData: {
      name: '',
      description: '',
      seasonEnabled: true,
      seasonName: '',
      startDate: '',
      endDate: ''
    },
    loading: false
  },

  onLoad() {
    // 设置默认日期
    const today = new Date();
    const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 3个月后

    this.setData({
      'formData.startDate': this.formatDate(today),
      'formData.endDate': this.formatDate(endDate)
    });
  },

  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  onDescInput(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  onSeasonToggle(e) {
    this.setData({ 'formData.seasonEnabled': e.detail });
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

    // 验证
    if (!form.name.trim()) {
      wx.showToast({
        title: '请输入Group名称',
        icon: 'error'
      });
      return;
    }

    if (form.seasonEnabled && !form.seasonName.trim()) {
      wx.showToast({
        title: '请输入赛季名称',
        icon: 'error'
      });
      return;
    }

    if (form.seasonEnabled && (!form.startDate || !form.endDate)) {
      wx.showToast({
        title: '请选择赛季日期',
        icon: 'error'
      });
      return;
    }

    this.setData({ loading: true });

    const app = getApp();
    const groupData = {
      name: form.name,
      description: form.description,
      season_enabled: form.seasonEnabled
    };

    // 创建Group
    api.createGroup(app.globalData.openid, groupData)
      .then(group => {
        // 如果启用赛季，则创建赛季
        if (form.seasonEnabled) {
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
          title: '创建成功！',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/group/detail?groupId=${group._id}`
          });
        }, 500);
      })
      .catch(err => {
        console.error('创建失败:', err);
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
