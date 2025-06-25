// pages/index/index.js
const app = getApp()
const reminderService = require('../../utils/reminderService')
const aiService = require('../../utils/aiService')

Page({
  data: {
    reminders: [], // 所有提醒数据
    filteredReminders: [], // 筛选后的提醒数据
    categories: [], // 分类数据
    categoryIndex: 0, // 当前选中的分类索引
    sortOptions: ['按到期时间', '按创建时间', '按重要程度', '按分类'],
    sortIndex: 0, // 当前排序方式索引
    searchKeyword: '', // 搜索关键词
    
    // 统计数据
    expiredCount: 0,
    warningCount: 0,
    normalCount: 0,
    
    // 智能建议
    showSuggestion: false,
    suggestions: [],
    
    // 页面状态
    loading: false,
    refreshing: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.loadData()
    this.updateStatistics()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadData().finally(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    // 可以实现分页加载
    console.log('到达底部')
  },

  // 初始化页面
  async initPage() {
    try {
      this.setData({ loading: true })
      
      // 加载分类数据
      const categories = await this.loadCategories()
      categories.unshift({ id: 0, name: '全部', icon: '📋', color: '#999' })
      
      this.setData({ categories })
      
      // 加载提醒数据
      await this.loadData()
      
      // 检查智能建议
      this.checkIntelligentSuggestions()
      
    } catch (error) {
      console.error('初始化页面失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载分类数据
  async loadCategories() {
    try {
      const categories = wx.getStorageSync('categories') || []
      return categories
    } catch (error) {
      console.error('加载分类失败:', error)
      return []
    }
  },

  // 加载提醒数据
  async loadData() {
    try {
      const reminders = await reminderService.getAllReminders()
      
      // 处理提醒数据，添加状态和显示文本
      const processedReminders = reminders.map(reminder => {
        const now = new Date()
        const expireDate = new Date(reminder.expireDate)
        const diffTime = expireDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let status = 'normal'
        let daysText = ''
        
        if (diffDays < 0) {
          status = 'expired'
          daysText = `已过期${Math.abs(diffDays)}天`
        } else if (diffDays <= reminder.remindDays) {
          status = 'warning'
          daysText = diffDays === 0 ? '今天到期' : `还有${diffDays}天`
        } else {
          status = 'normal'
          daysText = `还有${diffDays}天`
        }
        
        return {
          ...reminder,
          status,
          daysText,
          expireDateText: this.formatDate(expireDate),
          category: this.getCategoryById(reminder.categoryId)
        }
      })
      
      this.setData({ reminders: processedReminders })
      this.filterAndSortReminders()
      this.updateStatistics()
      
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 根据ID获取分类信息
  getCategoryById(categoryId) {
    const categories = this.data.categories
    return categories.find(cat => cat.id === categoryId) || categories[0]
  },

  // 筛选和排序提醒
  filterAndSortReminders() {
    let filtered = [...this.data.reminders]
    
    // 分类筛选
    if (this.data.categoryIndex > 0) {
      const selectedCategory = this.data.categories[this.data.categoryIndex]
      filtered = filtered.filter(item => item.categoryId === selectedCategory.id)
    }
    
    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
      )
    }
    
    // 排序
    switch (this.data.sortIndex) {
      case 0: // 按到期时间
        filtered.sort((a, b) => new Date(a.expireDate) - new Date(b.expireDate))
        break
      case 1: // 按创建时间
        filtered.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        break
      case 2: // 按重要程度
        filtered.sort((a, b) => {
          const statusOrder = { expired: 0, warning: 1, normal: 2 }
          return statusOrder[a.status] - statusOrder[b.status]
        })
        break
      case 3: // 按分类
        filtered.sort((a, b) => a.categoryId - b.categoryId)
        break
    }
    
    this.setData({ filteredReminders: filtered })
  },

  // 更新统计数据
  updateStatistics() {
    const reminders = this.data.reminders
    const expiredCount = reminders.filter(item => item.status === 'expired').length
    const warningCount = reminders.filter(item => item.status === 'warning').length
    const normalCount = reminders.filter(item => item.status === 'normal').length
    
    this.setData({
      expiredCount,
      warningCount,
      normalCount
    })
  },

  // 分类选择变化
  onCategoryChange(e) {
    this.setData({
      categoryIndex: parseInt(e.detail.value)
    })
    this.filterAndSortReminders()
  },

  // 排序方式变化
  onSortChange(e) {
    this.setData({
      sortIndex: parseInt(e.detail.value)
    })
    this.filterAndSortReminders()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    // 防抖处理
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.filterAndSortReminders()
    }, 300)
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 切换完成状态
  async toggleComplete(e) {
    const id = e.currentTarget.dataset.id
    try {
      await reminderService.toggleReminderComplete(id)
      this.loadData()
      
      wx.showToast({
        title: '状态已更新',
        icon: 'success'
      })
    } catch (error) {
      console.error('更新状态失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  },

  // 编辑提醒
  editReminder(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add/add?id=${id}&mode=edit`
    })
  },

  // 快速添加提醒
  quickAddReminder() {
    wx.showModal({
      title: '快速添加',
      editable: true,
      placeholderText: '请输入提醒内容...',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            // 使用AI服务分析输入内容
            const suggestion = await aiService.analyzeInput(res.content)
            
            if (suggestion) {
              // 显示智能建议
              this.setData({
                suggestions: [suggestion],
                showSuggestion: true
              })
            } else {
              // 直接跳转到添加页面
              wx.navigateTo({
                url: `/pages/add/add?title=${encodeURIComponent(res.content)}`
              })
            }
          } catch (error) {
            console.error('分析输入失败:', error)
            wx.navigateTo({
              url: `/pages/add/add?title=${encodeURIComponent(res.content)}`
            })
          }
        }
      }
    })
  },

  // 扫码识别
  scanCode() {
    wx.scanCode({
      success: async (res) => {
        try {
          wx.showLoading({ title: '识别中...' })
          
          // 使用AI服务识别商品信息
          const productInfo = await aiService.recognizeBarcode(res.result)
          
          if (productInfo) {
            wx.navigateTo({
              url: `/pages/add/add?product=${encodeURIComponent(JSON.stringify(productInfo))}`
            })
          } else {
            wx.showToast({
              title: '未识别到商品信息',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('扫码识别失败:', error)
          wx.showToast({
            title: '识别失败',
            icon: 'error'
          })
        } finally {
          wx.hideLoading()
        }
      },
      fail: (error) => {
        console.log('扫码取消或失败:', error)
      }
    })
  },

  // 拍照识别
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: async (res) => {
        try {
          wx.showLoading({ title: '识别中...' })
          
          const tempFilePath = res.tempFiles[0].tempFilePath
          
          // 使用OCR识别图片中的文字信息
          const ocrResult = await aiService.recognizeImage(tempFilePath)
          
          if (ocrResult) {
            wx.navigateTo({
              url: `/pages/add/add?ocr=${encodeURIComponent(JSON.stringify(ocrResult))}`
            })
          } else {
            wx.showToast({
              title: '未识别到有效信息',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('拍照识别失败:', error)
          wx.showToast({
            title: '识别失败',
            icon: 'error'
          })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  // 语音输入
  voiceInput() {
    wx.getRecorderManager().start({
      duration: 10000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })
    
    wx.showModal({
      title: '语音输入',
      content: '正在录音，请说出您要添加的提醒内容...',
      showCancel: true,
      confirmText: '完成',
      cancelText: '取消',
      success: (res) => {
        wx.getRecorderManager().stop()
        
        if (res.confirm) {
          // 处理语音识别结果
          this.processVoiceResult()
        }
      }
    })
  },

  // 处理语音识别结果
  async processVoiceResult() {
    try {
      wx.showLoading({ title: '识别中...' })
      
      // 这里应该调用语音识别服务
      // const voiceText = await aiService.recognizeVoice(audioPath)
      
      // 模拟语音识别结果
      const voiceText = '牛奶明天过期'
      
      if (voiceText) {
        const suggestion = await aiService.analyzeInput(voiceText)
        
        if (suggestion) {
          this.setData({
            suggestions: [suggestion],
            showSuggestion: true
          })
        } else {
          wx.navigateTo({
            url: `/pages/add/add?title=${encodeURIComponent(voiceText)}`
          })
        }
      }
    } catch (error) {
      console.error('语音识别失败:', error)
      wx.showToast({
        title: '识别失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 跳转到添加页面
  navigateToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  // 检查智能建议
  async checkIntelligentSuggestions() {
    try {
      const suggestions = await aiService.getIntelligentSuggestions(this.data.reminders)
      
      if (suggestions && suggestions.length > 0) {
        // 可以在适当的时机显示建议
        console.log('智能建议:', suggestions)
      }
    } catch (error) {
      console.error('获取智能建议失败:', error)
    }
  },

  // 应用智能建议
  applySuggestion(e) {
    const suggestion = e.currentTarget.dataset.suggestion
    
    wx.navigateTo({
      url: `/pages/add/add?suggestion=${encodeURIComponent(JSON.stringify(suggestion))}`
    })
    
    this.hideSuggestion()
  },

  // 隐藏建议弹窗
  hideSuggestion() {
    this.setData({ showSuggestion: false })
  },

  // 格式化日期
  formatDate(date) {
    const now = new Date()
    const target = new Date(date)
    
    const diffTime = target.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '明天'
    } else if (diffDays === -1) {
      return '昨天'
    } else if (diffDays > 1 && diffDays <= 7) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      return `周${weekdays[target.getDay()]}`
    } else {
      return `${target.getMonth() + 1}/${target.getDate()}`
    }
  },

  // 页面卸载时清理定时器
  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
  }
})