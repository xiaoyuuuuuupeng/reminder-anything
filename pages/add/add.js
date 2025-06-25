// pages/add/add.js
const app = getApp()
const reminderService = require('../../utils/reminderService')
const aiService = require('../../utils/aiService')
const dateUtils = require('../../utils/dateUtils')

Page({
  data: {
    // 页面状态
    isEdit: false,
    reminderId: null,
    saving: false,
    
    // 表单数据
    formData: {
      title: '',
      description: '',
      categoryId: 1,
      expireDate: '',
      remindTime: '09:00',
      remindDays: 3,
      priority: 'normal',
      tags: [],
      enableWechatNotify: true,
      enableAppNotify: true,
      repeatType: 'none'
    },
    
    // 表单验证
    titleError: '',
    dateError: '',
    
    // 选项数据
    categories: [],
    remindDaysOptions: [0, 1, 3, 7, 15, 30],
    repeatOptions: ['不重复', '每天', '每周', '每月', '每年'],
    repeatIndex: 0,
    priorityOptions: [
      { value: 'low', text: '低', icon: '🟢' },
      { value: 'normal', text: '中', icon: '🟡' },
      { value: 'high', text: '高', icon: '🔴' }
    ],
    
    // 智能建议
    dateSuggestions: [],
    
    // UI状态
    showAdvanced: false,
    showCustomDays: false,
    customRemindDays: '',
    showTemplateModal: false,
    
    // 标签输入
    newTag: '',
    
    // 模板数据
    templateCategories: [],
    
    // 当前日期
    today: ''
  },

  onLoad(options) {
    this.initPage(options)
  },

  // 初始化页面
  async initPage(options) {
    try {
      // 设置当前日期
      const today = new Date()
      this.setData({
        today: dateUtils.formatDate(today, 'YYYY-MM-DD')
      })
      
      // 加载分类数据
      await this.loadCategories()
      
      // 加载模板数据
      await this.loadTemplates()
      
      // 处理页面参数
      await this.handlePageOptions(options)
      
    } catch (error) {
      console.error('初始化页面失败:', error)
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      })
    }
  },

  // 处理页面参数
  async handlePageOptions(options) {
    if (options.id && options.mode === 'edit') {
      // 编辑模式
      await this.loadReminderData(options.id)
    } else if (options.title) {
      // 快速添加模式
      this.setData({
        'formData.title': decodeURIComponent(options.title)
      })
      await this.generateSmartSuggestions(options.title)
    } else if (options.product) {
      // 扫码识别模式
      const productInfo = JSON.parse(decodeURIComponent(options.product))
      await this.applyProductInfo(productInfo)
    } else if (options.ocr) {
      // OCR识别模式
      const ocrResult = JSON.parse(decodeURIComponent(options.ocr))
      await this.applyOcrResult(ocrResult)
    } else if (options.suggestion) {
      // 智能建议模式
      const suggestion = JSON.parse(decodeURIComponent(options.suggestion))
      await this.applySuggestionData(suggestion)
    }
  },

  // 加载分类数据
  async loadCategories() {
    try {
      const categories = wx.getStorageSync('categories') || []
      this.setData({ categories })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 加载模板数据
  async loadTemplates() {
    const templateCategories = [
      {
        name: '生活用品',
        templates: [
          { id: 1, name: '牛奶', icon: '🥛', description: '一般保质期7-15天', categoryId: 1, remindDays: 2 },
          { id: 2, name: '面包', icon: '🍞', description: '一般保质期3-7天', categoryId: 1, remindDays: 1 },
          { id: 3, name: '酸奶', icon: '🥛', description: '一般保质期15-21天', categoryId: 1, remindDays: 3 }
        ]
      },
      {
        name: '药品保健',
        templates: [
          { id: 4, name: '感冒药', icon: '💊', description: '注意查看有效期', categoryId: 2, remindDays: 30 },
          { id: 5, name: '维生素', icon: '💊', description: '一般有效期2-3年', categoryId: 2, remindDays: 60 }
        ]
      },
      {
        name: '重要事务',
        templates: [
          { id: 6, name: '信用卡还款', icon: '💳', description: '每月固定还款日', categoryId: 5, remindDays: 3 },
          { id: 7, name: '房租缴费', icon: '🏠', description: '每月固定缴费日', categoryId: 5, remindDays: 5 },
          { id: 8, name: '体检预约', icon: '🏥', description: '年度健康体检', categoryId: 6, remindDays: 7 }
        ]
      }
    ]
    
    this.setData({ templateCategories })
  },

  // 加载提醒数据（编辑模式）
  async loadReminderData(id) {
    try {
      const reminder = await reminderService.getReminderById(id)
      if (reminder) {
        this.setData({
          isEdit: true,
          reminderId: id,
          formData: {
            ...reminder,
            expireDate: dateUtils.formatDate(new Date(reminder.expireDate), 'YYYY-MM-DD')
          }
        })
      }
    } catch (error) {
      console.error('加载提醒数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 应用商品信息
  async applyProductInfo(productInfo) {
    const formData = { ...this.data.formData }
    
    if (productInfo.name) {
      formData.title = productInfo.name
    }
    
    if (productInfo.expireDate) {
      formData.expireDate = dateUtils.formatDate(new Date(productInfo.expireDate), 'YYYY-MM-DD')
    }
    
    if (productInfo.category) {
      const category = this.data.categories.find(cat => cat.name === productInfo.category)
      if (category) {
        formData.categoryId = category.id
      }
    }
    
    this.setData({ formData })
    await this.generateSmartSuggestions(productInfo.name)
  },

  // 应用OCR结果
  async applyOcrResult(ocrResult) {
    const formData = { ...this.data.formData }
    
    // 从OCR结果中提取信息
    if (ocrResult.productName) {
      formData.title = ocrResult.productName
    }
    
    if (ocrResult.expireDate) {
      formData.expireDate = dateUtils.formatDate(new Date(ocrResult.expireDate), 'YYYY-MM-DD')
    }
    
    this.setData({ formData })
    
    if (ocrResult.productName) {
      await this.generateSmartSuggestions(ocrResult.productName)
    }
  },

  // 应用智能建议数据
  async applySuggestionData(suggestion) {
    const formData = { ...this.data.formData }
    
    formData.title = suggestion.name
    formData.description = suggestion.description
    formData.categoryId = suggestion.categoryId
    formData.remindDays = suggestion.remindDays
    
    if (suggestion.expireDate) {
      formData.expireDate = dateUtils.formatDate(new Date(suggestion.expireDate), 'YYYY-MM-DD')
    }
    
    this.setData({ formData })
  },

  // 生成智能建议
  async generateSmartSuggestions(title) {
    try {
      const suggestions = await aiService.generateDateSuggestions(title)
      this.setData({ dateSuggestions: suggestions })
    } catch (error) {
      console.error('生成智能建议失败:', error)
    }
  },

  // 表单输入处理
  onTitleInput(e) {
    const title = e.detail.value
    this.setData({
      'formData.title': title,
      titleError: ''
    })
    
    // 防抖处理智能建议
    clearTimeout(this.suggestionTimer)
    this.suggestionTimer = setTimeout(() => {
      if (title.trim()) {
        this.generateSmartSuggestions(title)
      }
    }, 500)
  },

  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 分类选择
  selectCategory(e) {
    const categoryId = parseInt(e.currentTarget.dataset.id)
    this.setData({
      'formData.categoryId': categoryId
    })
  },

  // 到期日期变化
  onExpireDateChange(e) {
    this.setData({
      'formData.expireDate': e.detail.value,
      dateError: ''
    })
  },

  // 提醒时间变化
  onRemindTimeChange(e) {
    this.setData({
      'formData.remindTime': e.detail.value
    })
  },

  // 应用日期建议
  appleDateSuggestion(e) {
    const date = e.currentTarget.dataset.date
    this.setData({
      'formData.expireDate': dateUtils.formatDate(new Date(date), 'YYYY-MM-DD')
    })
  },

  // 选择提醒天数
  selectRemindDays(e) {
    const days = parseInt(e.currentTarget.dataset.days)
    this.setData({
      'formData.remindDays': days,
      showCustomDays: false
    })
  },

  // 切换自定义天数
  toggleCustomDays() {
    this.setData({
      showCustomDays: !this.data.showCustomDays
    })
  },

  // 自定义天数输入
  onCustomDaysInput(e) {
    const days = parseInt(e.detail.value) || 0
    this.setData({
      customRemindDays: e.detail.value,
      'formData.remindDays': days
    })
  },

  // 切换高级设置
  toggleAdvanced() {
    this.setData({
      showAdvanced: !this.data.showAdvanced
    })
  },

  // 重复设置变化
  onRepeatChange(e) {
    const index = parseInt(e.detail.value)
    const repeatTypes = ['none', 'daily', 'weekly', 'monthly', 'yearly']
    
    this.setData({
      repeatIndex: index,
      'formData.repeatType': repeatTypes[index]
    })
  },

  // 选择优先级
  selectPriority(e) {
    const priority = e.currentTarget.dataset.priority
    this.setData({
      'formData.priority': priority
    })
  },

  // 标签输入
  onTagInput(e) {
    this.setData({
      newTag: e.detail.value
    })
  },

  // 添加标签
  addTag() {
    const newTag = this.data.newTag.trim()
    if (newTag && !this.data.formData.tags.includes(newTag)) {
      const tags = [...this.data.formData.tags, newTag]
      this.setData({
        'formData.tags': tags,
        newTag: ''
      })
    }
  },

  // 移除标签
  removeTag(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const tags = [...this.data.formData.tags]
    tags.splice(index, 1)
    this.setData({
      'formData.tags': tags
    })
  },

  // 通知设置变化
  onWechatNotifyChange(e) {
    this.setData({
      'formData.enableWechatNotify': e.detail.value
    })
  },

  onAppNotifyChange(e) {
    this.setData({
      'formData.enableAppNotify': e.detail.value
    })
  },

  // 智能输入方法
  scanCode() {
    wx.scanCode({
      success: async (res) => {
        try {
          wx.showLoading({ title: '识别中...' })
          const productInfo = await aiService.recognizeBarcode(res.result)
          if (productInfo) {
            await this.applyProductInfo(productInfo)
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
      }
    })
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: async (res) => {
        try {
          wx.showLoading({ title: '识别中...' })
          const tempFilePath = res.tempFiles[0].tempFilePath
          const ocrResult = await aiService.recognizeImage(tempFilePath)
          if (ocrResult) {
            await this.applyOcrResult(ocrResult)
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

  voiceInput() {
    // 语音输入实现
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 显示模板
  showTemplates() {
    this.setData({ showTemplateModal: true })
  },

  hideTemplateModal() {
    this.setData({ showTemplateModal: false })
  },

  // 应用模板
  applyTemplate(e) {
    const template = e.currentTarget.dataset.template
    const formData = { ...this.data.formData }
    
    formData.title = template.name
    formData.description = template.description
    formData.categoryId = template.categoryId
    formData.remindDays = template.remindDays
    
    this.setData({ 
      formData,
      showTemplateModal: false 
    })
  },

  // 表单验证
  validateForm() {
    let isValid = true
    
    // 验证标题
    if (!this.data.formData.title.trim()) {
      this.setData({ titleError: '请输入提醒标题' })
      isValid = false
    }
    
    // 验证日期
    if (!this.data.formData.expireDate) {
      this.setData({ dateError: '请选择到期日期' })
      isValid = false
    } else {
      const expireDate = new Date(this.data.formData.expireDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (expireDate < today) {
        this.setData({ dateError: '到期日期不能早于今天' })
        isValid = false
      }
    }
    
    return isValid
  },

  // 保存提醒
  async save() {
    if (!this.validateForm()) {
      return
    }
    
    try {
      this.setData({ saving: true })
      
      const reminderData = {
        ...this.data.formData,
        expireDate: new Date(this.data.formData.expireDate).getTime(),
        createTime: this.data.isEdit ? undefined : Date.now(),
        updateTime: Date.now()
      }
      
      if (this.data.isEdit) {
        await reminderService.updateReminder(this.data.reminderId, reminderData)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        await reminderService.addReminder(reminderData)
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
      }
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      this.setData({ saving: false })
    }
  },

  // 取消
  cancel() {
    wx.navigateBack()
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
            await reminderService.deleteReminder(this.data.reminderId)
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
          }
        }
      }
    })
  },

  // 页面卸载时清理定时器
  onUnload() {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer)
    }
  }
})