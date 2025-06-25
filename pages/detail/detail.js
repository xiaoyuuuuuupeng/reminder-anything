// pages/detail/detail.js
const app = getApp()
const reminderService = require('../../utils/reminderService')
const aiService = require('../../utils/aiService')
const dateUtils = require('../../utils/dateUtils')

Page({
  data: {
    // 提醒数据
    reminder: {},
    reminderId: null,
    
    // 分类信息
    categoryInfo: {},
    
    // 状态配置
    statusConfig: {
      normal: { icon: '✅', text: '正常' },
      warning: { icon: '⚠️', text: '即将到期' },
      expired: { icon: '❌', text: '已过期' },
      completed: { icon: '✔️', text: '已完成' }
    },
    
    // 优先级配置
    priorityConfig: {
      low: { icon: '🟢', text: '低' },
      normal: { icon: '🟡', text: '中' },
      high: { icon: '🔴', text: '高' }
    },
    
    // 计算属性
    expireDateText: '',
    timeRemainingText: '',
    timeRemainingClass: '',
    repeatText: '',
    
    // 历史记录
    historyList: [],
    
    // 相关建议
    suggestions: [],
    
    // UI状态
    loading: false,
    loadingText: '',
    showSnoozeModal: false,
    
    // 延期选项
    snoozeOptions: [
      { value: 1, text: '1天后', icon: '📅' },
      { value: 3, text: '3天后', icon: '📅' },
      { value: 7, text: '1周后', icon: '📅' },
      { value: 30, text: '1个月后', icon: '📅' }
    ],
    customSnoozeDays: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ reminderId: options.id })
      this.loadReminderDetail(options.id)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.reminderId) {
      this.loadReminderDetail(this.data.reminderId)
    }
  },

  // 加载提醒详情
  async loadReminderDetail(id) {
    try {
      this.setData({ 
        loading: true, 
        loadingText: '加载中...' 
      })
      
      const reminder = await reminderService.getReminderById(id)
      if (!reminder) {
        wx.showToast({
          title: '提醒不存在',
          icon: 'error'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }
      
      // 加载分类信息
      const categories = wx.getStorageSync('categories') || []
      const categoryInfo = categories.find(cat => cat.id === reminder.categoryId) || 
                          { id: 1, name: '默认', icon: '📝' }
      
      // 计算时间相关信息
      const timeInfo = this.calculateTimeInfo(reminder)
      
      // 加载历史记录
      const historyList = await this.loadHistory(id)
      
      // 生成相关建议
      const suggestions = await this.generateSuggestions(reminder)
      
      this.setData({
        reminder,
        categoryInfo,
        historyList,
        suggestions,
        ...timeInfo
      })
      
    } catch (error) {
      console.error('加载提醒详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算时间相关信息
  calculateTimeInfo(reminder) {
    const now = new Date()
    const expireDate = new Date(reminder.expireDate)
    const timeDiff = expireDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    
    // 格式化到期日期
    const expireDateText = dateUtils.formatDate(expireDate, 'YYYY年MM月DD日')
    
    // 计算剩余时间文本和样式
    let timeRemainingText = ''
    let timeRemainingClass = ''
    
    if (reminder.status === 'completed') {
      timeRemainingText = '已完成'
      timeRemainingClass = 'completed'
    } else if (daysDiff < 0) {
      timeRemainingText = `已过期${Math.abs(daysDiff)}天`
      timeRemainingClass = 'expired'
    } else if (daysDiff === 0) {
      timeRemainingText = '今天到期'
      timeRemainingClass = 'expired'
    } else if (daysDiff <= reminder.remindDays) {
      timeRemainingText = `还有${daysDiff}天`
      timeRemainingClass = 'warning'
    } else {
      timeRemainingText = `还有${daysDiff}天`
      timeRemainingClass = 'normal'
    }
    
    // 重复设置文本
    const repeatTexts = {
      none: '不重复',
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      yearly: '每年'
    }
    const repeatText = repeatTexts[reminder.repeatType] || '不重复'
    
    return {
      expireDateText,
      timeRemainingText,
      timeRemainingClass,
      repeatText
    }
  },

  // 加载历史记录
  async loadHistory(reminderId) {
    try {
      const history = wx.getStorageSync(`history_${reminderId}`) || []
      return history.map(item => ({
        ...item,
        timeText: dateUtils.formatDate(new Date(item.timestamp), 'MM-DD HH:mm')
      }))
    } catch (error) {
      console.error('加载历史记录失败:', error)
      return []
    }
  },

  // 生成相关建议
  async generateSuggestions(reminder) {
    try {
      const suggestions = await aiService.generateRelatedSuggestions(reminder)
      return suggestions.slice(0, 3) // 最多显示3个建议
    } catch (error) {
      console.error('生成建议失败:', error)
      return []
    }
  },

  // 添加历史记录
  async addHistory(action, icon = '📝') {
    try {
      const historyKey = `history_${this.data.reminderId}`
      const history = wx.getStorageSync(historyKey) || []
      
      const newRecord = {
        id: Date.now(),
        action,
        icon,
        timestamp: Date.now()
      }
      
      history.unshift(newRecord)
      
      // 只保留最近20条记录
      if (history.length > 20) {
        history.splice(20)
      }
      
      wx.setStorageSync(historyKey, history)
      
      // 更新页面显示
      const historyList = history.map(item => ({
        ...item,
        timeText: dateUtils.formatDate(new Date(item.timestamp), 'MM-DD HH:mm')
      }))
      
      this.setData({ historyList })
      
    } catch (error) {
      console.error('添加历史记录失败:', error)
    }
  },

  // 编辑提醒
  editReminder() {
    wx.navigateTo({
      url: `/pages/add/add?id=${this.data.reminderId}&mode=edit`
    })
  },

  // 标记完成
  async markAsCompleted() {
    try {
      this.setData({ 
        loading: true, 
        loadingText: '处理中...' 
      })
      
      const updatedReminder = {
        ...this.data.reminder,
        status: 'completed',
        completedTime: Date.now(),
        updateTime: Date.now()
      }
      
      await reminderService.updateReminder(this.data.reminderId, updatedReminder)
      
      // 添加历史记录
      await this.addHistory('标记为已完成', '✅')
      
      wx.showToast({
        title: '已标记完成',
        icon: 'success'
      })
      
      // 刷新数据
      await this.loadReminderDetail(this.data.reminderId)
      
    } catch (error) {
      console.error('标记完成失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示延期弹窗
  snoozeReminder() {
    this.setData({ showSnoozeModal: true })
  },

  // 隐藏延期弹窗
  hideSnoozeModal() {
    this.setData({ 
      showSnoozeModal: false,
      customSnoozeDays: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 选择延期天数
  async selectSnooze(e) {
    const days = parseInt(e.currentTarget.dataset.days)
    await this.performSnooze(days)
  },

  // 自定义延期天数输入
  onCustomSnoozeInput(e) {
    this.setData({ customSnoozeDays: e.detail.value })
  },

  // 确认自定义延期
  async confirmCustomSnooze() {
    const days = parseInt(this.data.customSnoozeDays)
    if (days > 0) {
      await this.performSnooze(days)
    }
  },

  // 执行延期操作
  async performSnooze(days) {
    try {
      this.setData({ 
        loading: true, 
        loadingText: '延期中...' 
      })
      
      const newExpireDate = new Date(this.data.reminder.expireDate)
      newExpireDate.setDate(newExpireDate.getDate() + days)
      
      const updatedReminder = {
        ...this.data.reminder,
        expireDate: newExpireDate.getTime(),
        status: 'normal', // 重置状态
        updateTime: Date.now()
      }
      
      await reminderService.updateReminder(this.data.reminderId, updatedReminder)
      
      // 添加历史记录
      await this.addHistory(`延期${days}天`, '⏰')
      
      wx.showToast({
        title: `已延期${days}天`,
        icon: 'success'
      })
      
      // 隐藏弹窗并刷新数据
      this.hideSnoozeModal()
      await this.loadReminderDetail(this.data.reminderId)
      
    } catch (error) {
      console.error('延期失败:', error)
      wx.showToast({
        title: '延期失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 复制提醒
  duplicateReminder() {
    const reminder = this.data.reminder
    const duplicateData = {
      title: `${reminder.title} (副本)`,
      description: reminder.description,
      categoryId: reminder.categoryId,
      remindDays: reminder.remindDays,
      remindTime: reminder.remindTime,
      priority: reminder.priority,
      tags: [...(reminder.tags || [])],
      enableWechatNotify: reminder.enableWechatNotify,
      enableAppNotify: reminder.enableAppNotify,
      repeatType: reminder.repeatType
    }
    
    const encodedData = encodeURIComponent(JSON.stringify(duplicateData))
    wx.navigateTo({
      url: `/pages/add/add?duplicate=${encodedData}`
    })
  },

  // 分享提醒
  shareReminder() {
    const reminder = this.data.reminder
    const shareText = `提醒：${reminder.title}\n到期时间：${this.data.expireDateText}\n剩余时间：${this.data.timeRemainingText}`
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 设置分享内容
    wx.onShareAppMessage(() => {
      return {
        title: `提醒：${reminder.title}`,
        desc: `${this.data.expireDateText} - ${this.data.timeRemainingText}`,
        path: `/pages/detail/detail?id=${this.data.reminderId}`
      }
    })
    
    wx.showToast({
      title: '可以分享了',
      icon: 'success'
    })
  },

  // 应用建议
  applySuggestion(e) {
    const suggestion = e.currentTarget.dataset.suggestion
    
    if (suggestion.type === 'create') {
      // 创建新提醒
      const suggestionData = encodeURIComponent(JSON.stringify(suggestion.data))
      wx.navigateTo({
        url: `/pages/add/add?suggestion=${suggestionData}`
      })
    } else if (suggestion.type === 'modify') {
      // 修改当前提醒
      wx.showModal({
        title: '应用建议',
        content: `确定要${suggestion.description}吗？`,
        success: async (res) => {
          if (res.confirm) {
            await this.applySuggestionModification(suggestion)
          }
        }
      })
    }
  },

  // 应用建议修改
  async applySuggestionModification(suggestion) {
    try {
      this.setData({ 
        loading: true, 
        loadingText: '应用建议中...' 
      })
      
      const updatedReminder = {
        ...this.data.reminder,
        ...suggestion.data,
        updateTime: Date.now()
      }
      
      await reminderService.updateReminder(this.data.reminderId, updatedReminder)
      
      // 添加历史记录
      await this.addHistory(`应用建议：${suggestion.description}`, '💡')
      
      wx.showToast({
        title: '建议已应用',
        icon: 'success'
      })
      
      // 刷新数据
      await this.loadReminderDetail(this.data.reminderId)
      
    } catch (error) {
      console.error('应用建议失败:', error)
      wx.showToast({
        title: '应用失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 删除提醒
  deleteReminder() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个提醒吗？',
      confirmColor: '#DC3545',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ 
              loading: true, 
              loadingText: '删除中...' 
            })
            
            await reminderService.deleteReminder(this.data.reminderId)
            
            // 删除历史记录
            wx.removeStorageSync(`history_${this.data.reminderId}`)
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
            
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          } finally {
            this.setData({ loading: false })
          }
        }
      }
    })
  },

  // 页面分享
  onShareAppMessage() {
    const reminder = this.data.reminder
    return {
      title: `提醒：${reminder.title}`,
      desc: `${this.data.expireDateText} - ${this.data.timeRemainingText}`,
      path: `/pages/detail/detail?id=${this.data.reminderId}`
    }
  },

  onShareTimeline() {
    const reminder = this.data.reminder
    return {
      title: `提醒：${reminder.title} - ${this.data.timeRemainingText}`,
      query: `id=${this.data.reminderId}`
    }
  }
})