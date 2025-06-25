// pages/settings/settings.js
const reminderService = require('../../utils/reminderService');
const statisticsService = require('../../utils/statisticsService');
const dateUtils = require('../../utils/dateUtils');

Page({
  data: {
    // 用户信息
    userInfo: {},
    userStats: {
      total: 0,
      completed: 0,
      expired: 0
    },
    
    // 应用版本
    appVersion: '1.0.0',
    
    // 设置数据
    settings: {
      // 提醒设置
      defaultRemindTime: '09:00',
      defaultRemindDaysIndex: 2, // 对应3天
      repeatIntervalIndex: 1, // 对应1小时
      enableQuietHours: false,
      quietHours: {
        start: '22:00',
        end: '08:00'
      },
      
      // 智能设置
      enableSmartSuggestion: true,
      enableLearning: true,
      enableAutoCategory: true,
      enableOCR: true,
      
      // 通知设置
      enableWechatNotification: true,
      enableAppNotification: true,
      enableSound: true,
      enableVibration: true,
      
      // 其他设置
      themeIndex: 0,
      languageIndex: 0,
      enableAutoCleanup: false,
      startPageIndex: 0
    },
    
    // 选项数据
    remindDaysOptions: ['当天', '1天前', '2天前', '3天前', '5天前', '7天前', '15天前', '30天前'],
    repeatIntervalOptions: ['15分钟', '1小时', '3小时', '6小时', '12小时', '1天', '3天'],
    themeOptions: ['自动', '浅色', '深色'],
    languageOptions: ['简体中文', 'English'],
    startPageOptions: ['首页', '添加提醒', '统计', '设置'],
    
    // 分类数据
    categories: [],
    
    // 数据统计
    dataStats: {
      totalReminders: 0,
      storageSize: '0KB',
      lastBackup: '从未'
    },
    
    // 分类弹窗
    showCategoryModal: false,
    categoryModalTitle: '添加分类',
    categoryForm: {
      id: null,
      name: '',
      icon: '📝',
      color: '#1890ff'
    },
    
    // 图标和颜色选项
    iconOptions: ['📝', '🍎', '💊', '🧴', '📄', '💳', '🎂', '🏥', '🚗', '📱', '💻', '📚', '🎵', '🎮', '⚽', '🎨'],
    colorOptions: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16']
  },

  onLoad() {
    this.loadUserInfo();
    this.loadSettings();
    this.loadCategories();
    this.loadDataStats();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadUserStats();
    this.loadDataStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ userInfo });
    this.loadUserStats();
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const stats = await statisticsService.getBasicStats();
      this.setData({
        userStats: {
          total: stats.total,
          completed: stats.completed,
          expired: stats.expired
        }
      });
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('appSettings') || {};
    this.setData({
      settings: {
        ...this.data.settings,
        ...settings
      }
    });
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('appSettings', this.data.settings);
  },

  // 加载分类
  async loadCategories() {
    try {
      const categories = await reminderService.getCategories();
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const reminders = await reminderService.getReminders({ category: category.name });
          return {
            ...category,
            count: reminders.length
          };
        })
      );
      this.setData({ categories: categoriesWithCount });
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  },

  // 加载数据统计
  async loadDataStats() {
    try {
      const reminders = await reminderService.getAllReminders();
      const storageInfo = wx.getStorageInfoSync();
      const lastBackup = wx.getStorageSync('lastBackupTime') || '从未';
      
      this.setData({
        dataStats: {
          totalReminders: reminders.length,
          storageSize: `${Math.round(storageInfo.currentSize)}KB`,
          lastBackup: lastBackup === '从未' ? '从未' : dateUtils.formatDate(new Date(lastBackup), 'MM-DD HH:mm')
        }
      });
    } catch (error) {
      console.error('加载数据统计失败:', error);
    }
  },

  // 获取用户信息
  onGetUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将清除用户信息，是否继续？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ userInfo: {} });
          wx.removeStorageSync('userInfo');
          wx.showToast({
            title: '已退出',
            icon: 'success'
          });
        }
      }
    });
  },

  // 默认提醒时间变化
  onDefaultTimeChange(e) {
    this.setData({
      'settings.defaultRemindTime': e.detail.value
    });
    this.saveSettings();
  },

  // 提醒天数变化
  onRemindDaysChange(e) {
    this.setData({
      'settings.defaultRemindDaysIndex': parseInt(e.detail.value)
    });
    this.saveSettings();
  },

  // 重复间隔变化
  onRepeatIntervalChange(e) {
    this.setData({
      'settings.repeatIntervalIndex': parseInt(e.detail.value)
    });
    this.saveSettings();
  },

  // 静音时段开关
  onQuietHoursToggle(e) {
    this.setData({
      'settings.enableQuietHours': e.detail.value
    });
    this.saveSettings();
  },

  // 静音开始时间
  onQuietStartChange(e) {
    this.setData({
      'settings.quietHours.start': e.detail.value
    });
    this.saveSettings();
  },

  // 静音结束时间
  onQuietEndChange(e) {
    this.setData({
      'settings.quietHours.end': e.detail.value
    });
    this.saveSettings();
  },

  // 智能建议开关
  onSmartSuggestionToggle(e) {
    this.setData({
      'settings.enableSmartSuggestion': e.detail.value
    });
    this.saveSettings();
  },

  // 学习开关
  onLearningToggle(e) {
    this.setData({
      'settings.enableLearning': e.detail.value
    });
    this.saveSettings();
  },

  // 自动分类开关
  onAutoCategoryToggle(e) {
    this.setData({
      'settings.enableAutoCategory': e.detail.value
    });
    this.saveSettings();
  },

  // OCR开关
  onOCRToggle(e) {
    this.setData({
      'settings.enableOCR': e.detail.value
    });
    this.saveSettings();
  },

  // 微信通知开关
  onWechatNotificationToggle(e) {
    this.setData({
      'settings.enableWechatNotification': e.detail.value
    });
    this.saveSettings();
  },

  // 应用通知开关
  onAppNotificationToggle(e) {
    this.setData({
      'settings.enableAppNotification': e.detail.value
    });
    this.saveSettings();
  },

  // 声音开关
  onSoundToggle(e) {
    this.setData({
      'settings.enableSound': e.detail.value
    });
    this.saveSettings();
  },

  // 震动开关
  onVibrationToggle(e) {
    this.setData({
      'settings.enableVibration': e.detail.value
    });
    this.saveSettings();
  },

  // 主题变化
  onThemeChange(e) {
    this.setData({
      'settings.themeIndex': parseInt(e.detail.value)
    });
    this.saveSettings();
  },

  // 语言变化
  onLanguageChange(e) {
    this.setData({
      'settings.languageIndex': parseInt(e.detail.value)
    });
    this.saveSettings();
  },

  // 自动清理开关
  onAutoCleanupToggle(e) {
    this.setData({
      'settings.enableAutoCleanup': e.detail.value
    });
    this.saveSettings();
  },

  // 启动页变化
  onStartPageChange(e) {
    this.setData({
      'settings.startPageIndex': parseInt(e.detail.value)
    });
    this.saveSettings();
  },

  // 添加分类
  onAddCategory() {
    this.setData({
      showCategoryModal: true,
      categoryModalTitle: '添加分类',
      categoryForm: {
        id: null,
        name: '',
        icon: '📝',
        color: '#1890ff'
      }
    });
  },

  // 编辑分类
  onEditCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      showCategoryModal: true,
      categoryModalTitle: '编辑分类',
      categoryForm: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color
      }
    });
  },

  // 删除分类
  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === id);
    
    if (!category) {
      wx.showToast({
        title: '分类不存在',
        icon: 'error'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${category.name}"吗？删除后该分类下的所有提醒将移动到默认分类。`,
      success: (res) => {
        if (res.confirm) {
          this.deleteCategory(id);
        }
      }
    });
  },

  // 执行删除分类
  deleteCategory(id) {
    wx.showLoading({
      title: '删除中...'
    });

    try {
      // 获取该分类下的所有提醒
      const reminders = wx.getStorageSync('reminders') || [];
      const updatedReminders = reminders.map(reminder => {
        if (reminder.category === id) {
          return {
            ...reminder,
            category: 'default' // 移动到默认分类
          };
        }
        return reminder;
      });

      // 删除分类
      const categories = this.data.categories.filter(c => c.id !== id);
      
      // 保存数据
      wx.setStorageSync('categories', categories);
      wx.setStorageSync('reminders', updatedReminders);
      
      // 更新页面数据
      this.setData({
        categories
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('删除分类失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  }

});