// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'reminder-cloud-env', // 云开发环境ID
        traceUser: true
      })
    }

    // 检查更新
    this.checkForUpdate()
    
    // 初始化本地存储
    this.initLocalStorage()
    
    // 获取用户信息
    this.getUserProfile()
  },

  onShow() {
    // 小程序显示时检查待处理提醒
    this.checkPendingReminders()
  },

  // 检查小程序更新
  checkForUpdate() {
    const updateManager = wx.getUpdateManager()
    
    updateManager.onCheckForUpdate((res) => {
      console.log('检查更新结果:', res.hasUpdate)
    })
    
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })
  },

  // 初始化本地存储
  initLocalStorage() {
    try {
      // 初始化提醒数据
      const reminders = wx.getStorageSync('reminders')
      if (!reminders) {
        wx.setStorageSync('reminders', [])
      }
      
      // 初始化分类数据
      const categories = wx.getStorageSync('categories')
      if (!categories) {
        wx.setStorageSync('categories', this.getDefaultCategories())
      }
      
      // 初始化用户设置
      const settings = wx.getStorageSync('userSettings')
      if (!settings) {
        wx.setStorageSync('userSettings', this.getDefaultSettings())
      }
    } catch (e) {
      console.error('初始化本地存储失败:', e)
    }
  },

  // 获取默认分类
  getDefaultCategories() {
    return [
      { id: 1, name: '食品', icon: '🍎', color: '#FF6B6B' },
      { id: 2, name: '药品', icon: '💊', color: '#4ECDC4' },
      { id: 3, name: '化妆品', icon: '💄', color: '#45B7D1' },
      { id: 4, name: '证件', icon: '📄', color: '#96CEB4' },
      { id: 5, name: '账单', icon: '💳', color: '#FFEAA7' },
      { id: 6, name: '纪念日', icon: '🎂', color: '#DDA0DD' },
      { id: 7, name: '其他', icon: '📦', color: '#95A5A6' }
    ]
  },

  // 获取默认设置
  getDefaultSettings() {
    return {
      defaultRemindDays: 3, // 默认提前提醒天数
      enableNotification: true, // 是否开启通知
      reminderTime: '09:00', // 默认提醒时间
      autoBackup: true, // 自动备份
      theme: 'light' // 主题
    }
  },

  // 获取用户信息
  getUserProfile() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: (res) => {
              this.globalData.userInfo = res.userInfo
            }
          })
        }
      }
    })
  },

  // 检查待处理提醒
  checkPendingReminders() {
    try {
      const reminders = wx.getStorageSync('reminders') || []
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      const pendingReminders = reminders.filter(reminder => {
        const expireDate = new Date(reminder.expireDate)
        const remindDate = new Date(expireDate.getTime() - reminder.remindDays * 24 * 60 * 60 * 1000)
        return remindDate <= today && !reminder.isCompleted
      })
      
      if (pendingReminders.length > 0) {
        this.globalData.pendingCount = pendingReminders.length
        // 可以在这里触发通知
        this.sendNotification(pendingReminders)
      }
    } catch (e) {
      console.error('检查待处理提醒失败:', e)
    }
  },

  // 发送通知
  sendNotification(reminders) {
    if (reminders.length === 0) return
    
    const settings = wx.getStorageSync('userSettings')
    if (!settings.enableNotification) return
    
    // 这里可以集成微信订阅消息
    wx.requestSubscribeMessage({
      tmplIds: ['your-template-id'], // 替换为实际的模板ID
      success: (res) => {
        console.log('订阅消息成功:', res)
      },
      fail: (err) => {
        console.error('订阅消息失败:', err)
      }
    })
  },

  globalData: {
    userInfo: null,
    pendingCount: 0,
    version: '1.0.0'
  }
})