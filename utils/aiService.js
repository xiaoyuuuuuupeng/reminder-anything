// utils/aiService.js
// AI智能服务 - 提供智能日期建议、OCR识别、商品识别等功能

const dateUtils = require('./dateUtils')

class AIService {
  constructor() {
    // 预设规则库
    this.presetRules = {
      // 食品类
      food: {
        '牛奶': { days: 7, category: 1, description: '一般保质期7-15天' },
        '酸奶': { days: 15, category: 1, description: '一般保质期15-21天' },
        '面包': { days: 3, category: 1, description: '一般保质期3-7天' },
        '鸡蛋': { days: 30, category: 1, description: '一般保质期30-45天' },
        '西瓜': { days: 5, category: 1, description: '建议3-5天内食用' },
        '苹果': { days: 14, category: 1, description: '常温可保存1-2周' },
        '香蕉': { days: 3, category: 1, description: '建议3天内食用' },
        '蔬菜': { days: 7, category: 1, description: '新鲜蔬菜建议一周内食用' },
        '肉类': { days: 3, category: 1, description: '新鲜肉类建议3天内食用' },
        '海鲜': { days: 1, category: 1, description: '新鲜海鲜当天食用最佳' }
      },
      
      // 药品保健
      medicine: {
        '感冒药': { days: 30, category: 2, description: '注意查看有效期' },
        '维生素': { days: 60, category: 2, description: '一般有效期2-3年' },
        '抗生素': { days: 30, category: 2, description: '严格按有效期使用' },
        '胰岛素': { days: 7, category: 2, description: '开封后需冷藏保存' },
        '眼药水': { days: 30, category: 2, description: '开封后一个月内使用' }
      },
      
      // 日用品
      daily: {
        '牙膏': { days: 90, category: 3, description: '一般可使用2-3个月' },
        '洗发水': { days: 180, category: 3, description: '开封后建议半年内使用' },
        '化妆品': { days: 90, category: 3, description: '开封后3-6个月内使用' },
        '护肤品': { days: 60, category: 3, description: '开封后2-3个月内使用' },
        '香水': { days: 365, category: 3, description: '一般可保存1-2年' }
      },
      
      // 证件文档
      document: {
        '身份证': { days: 180, category: 4, description: '到期前6个月提醒' },
        '护照': { days: 180, category: 4, description: '到期前6个月提醒' },
        '驾驶证': { days: 90, category: 4, description: '到期前3个月提醒' },
        '港澳通行证': { days: 90, category: 4, description: '到期前3个月提醒' },
        '签证': { days: 30, category: 4, description: '到期前1个月提醒' },
        '保险': { days: 30, category: 4, description: '到期前1个月提醒' }
      },
      
      // 重要事务
      important: {
        '信用卡还款': { days: 3, category: 5, description: '还款日前3天提醒' },
        '房贷还款': { days: 5, category: 5, description: '还款日前5天提醒' },
        '房租': { days: 5, category: 5, description: '缴费日前5天提醒' },
        '水电费': { days: 2, category: 5, description: '缴费截止前2天提醒' },
        '燃气费': { days: 2, category: 5, description: '缴费截止前2天提醒' },
        '网费': { days: 3, category: 5, description: '到期前3天提醒' },
        '手机费': { days: 3, category: 5, description: '到期前3天提醒' }
      },
      
      // 健康医疗
      health: {
        '体检': { days: 7, category: 6, description: '体检日前一周提醒' },
        '疫苗': { days: 7, category: 6, description: '接种日前一周提醒' },
        '复查': { days: 3, category: 6, description: '复查日前3天提醒' },
        '看牙': { days: 1, category: 6, description: '预约日前1天提醒' },
        '配眼镜': { days: 1, category: 6, description: '取镜日前1天提醒' }
      }
    }
    
    // 关键词映射
    this.keywordMapping = {
      // 食品关键词
      '奶': 'food',
      '蛋': 'food', 
      '肉': 'food',
      '菜': 'food',
      '果': 'food',
      '饮': 'food',
      '食': 'food',
      
      // 药品关键词
      '药': 'medicine',
      '片': 'medicine',
      '胶囊': 'medicine',
      '口服液': 'medicine',
      '维生素': 'medicine',
      
      // 日用品关键词
      '洗': 'daily',
      '护': 'daily',
      '化妆': 'daily',
      '香水': 'daily',
      '牙膏': 'daily',
      
      // 证件关键词
      '证': 'document',
      '照': 'document',
      '保险': 'document',
      '签证': 'document',
      
      // 事务关键词
      '还款': 'important',
      '缴费': 'important',
      '房租': 'important',
      '水电': 'important',
      
      // 健康关键词
      '体检': 'health',
      '医院': 'health',
      '看病': 'health',
      '疫苗': 'health'
    }
  }

  // 生成智能日期建议
  async generateDateSuggestions(title) {
    try {
      const suggestions = []
      const now = new Date()
      
      // 1. 基于预设规则的建议
      const ruleBasedSuggestions = this.getRuleBasedSuggestions(title, now)
      suggestions.push(...ruleBasedSuggestions)
      
      // 2. 基于用户历史的建议
      const historyBasedSuggestions = await this.getHistoryBasedSuggestions(title, now)
      suggestions.push(...historyBasedSuggestions)
      
      // 3. 通用时间建议
      const commonSuggestions = this.getCommonSuggestions(now)
      suggestions.push(...commonSuggestions)
      
      // 去重并排序
      const uniqueSuggestions = this.deduplicateAndSort(suggestions)
      
      return uniqueSuggestions.slice(0, 6) // 最多返回6个建议
    } catch (error) {
      console.error('生成日期建议失败:', error)
      return this.getCommonSuggestions(new Date())
    }
  }

  // 基于规则的建议
  getRuleBasedSuggestions(title, baseDate) {
    const suggestions = []
    const titleLower = title.toLowerCase()
    
    // 遍历所有规则类别
    Object.keys(this.presetRules).forEach(category => {
      const rules = this.presetRules[category]
      
      Object.keys(rules).forEach(keyword => {
        if (titleLower.includes(keyword.toLowerCase()) || 
            title.includes(keyword)) {
          const rule = rules[keyword]
          const suggestedDate = new Date(baseDate)
          suggestedDate.setDate(suggestedDate.getDate() + rule.days)
          
          suggestions.push({
            date: suggestedDate.getTime(),
            text: dateUtils.formatDate(suggestedDate, 'MM月DD日'),
            description: rule.description,
            confidence: 0.9,
            source: 'rule',
            categoryId: rule.category,
            remindDays: Math.min(rule.days / 3, 7) // 提醒天数为到期天数的1/3，最多7天
          })
        }
      })
    })
    
    // 基于关键词的模糊匹配
    Object.keys(this.keywordMapping).forEach(keyword => {
      if (titleLower.includes(keyword)) {
        const categoryKey = this.keywordMapping[keyword]
        const categoryRules = this.presetRules[categoryKey]
        
        if (categoryRules) {
          // 取该类别的平均值
          const avgDays = Math.round(
            Object.values(categoryRules).reduce((sum, rule) => sum + rule.days, 0) / 
            Object.keys(categoryRules).length
          )
          
          const suggestedDate = new Date(baseDate)
          suggestedDate.setDate(suggestedDate.getDate() + avgDays)
          
          suggestions.push({
            date: suggestedDate.getTime(),
            text: dateUtils.formatDate(suggestedDate, 'MM月DD日'),
            description: `基于${keyword}类物品的一般规律`,
            confidence: 0.7,
            source: 'keyword',
            categoryId: Object.values(categoryRules)[0].category,
            remindDays: Math.min(avgDays / 3, 7)
          })
        }
      }
    })
    
    return suggestions
  }

  // 基于历史的建议
  async getHistoryBasedSuggestions(title, baseDate) {
    try {
      const reminders = wx.getStorageSync('reminders') || []
      const similarReminders = reminders.filter(reminder => 
        this.calculateSimilarity(title, reminder.title) > 0.6
      )
      
      if (similarReminders.length === 0) {
        return []
      }
      
      const suggestions = []
      
      // 计算平均到期时间
      const avgDays = Math.round(
        similarReminders.reduce((sum, reminder) => {
          const createDate = new Date(reminder.createTime)
          const expireDate = new Date(reminder.expireDate)
          const days = Math.ceil((expireDate - createDate) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / similarReminders.length
      )
      
      const suggestedDate = new Date(baseDate)
      suggestedDate.setDate(suggestedDate.getDate() + avgDays)
      
      suggestions.push({
        date: suggestedDate.getTime(),
        text: dateUtils.formatDate(suggestedDate, 'MM月DD日'),
        description: `基于您的历史记录（${similarReminders.length}条相似记录）`,
        confidence: 0.8,
        source: 'history',
        categoryId: similarReminders[0].categoryId,
        remindDays: similarReminders[0].remindDays
      })
      
      return suggestions
    } catch (error) {
      console.error('获取历史建议失败:', error)
      return []
    }
  }

  // 通用建议
  getCommonSuggestions(baseDate) {
    const suggestions = []
    const commonPeriods = [1, 3, 7, 14, 30, 90]
    
    commonPeriods.forEach(days => {
      const suggestedDate = new Date(baseDate)
      suggestedDate.setDate(suggestedDate.getDate() + days)
      
      let description = ''
      if (days === 1) description = '明天'
      else if (days === 3) description = '3天后'
      else if (days === 7) description = '1周后'
      else if (days === 14) description = '2周后'
      else if (days === 30) description = '1个月后'
      else if (days === 90) description = '3个月后'
      
      suggestions.push({
        date: suggestedDate.getTime(),
        text: dateUtils.formatDate(suggestedDate, 'MM月DD日'),
        description,
        confidence: 0.5,
        source: 'common',
        categoryId: 1,
        remindDays: Math.min(days / 3, 7)
      })
    })
    
    return suggestions
  }

  // 计算文本相似度
  calculateSimilarity(text1, text2) {
    const set1 = new Set(text1.toLowerCase().split(''))
    const set2 = new Set(text2.toLowerCase().split(''))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }

  // 去重并排序
  deduplicateAndSort(suggestions) {
    // 按日期去重
    const uniqueMap = new Map()
    suggestions.forEach(suggestion => {
      const dateKey = dateUtils.formatDate(new Date(suggestion.date), 'YYYY-MM-DD')
      if (!uniqueMap.has(dateKey) || 
          uniqueMap.get(dateKey).confidence < suggestion.confidence) {
        uniqueMap.set(dateKey, suggestion)
      }
    })
    
    // 按置信度和日期排序
    return Array.from(uniqueMap.values()).sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }
      return a.date - b.date
    })
  }

  // 条形码识别
  async recognizeBarcode(code) {
    try {
      // 这里应该调用真实的商品数据库API
      // 为了演示，使用模拟数据
      const mockProducts = {
        '6901028089296': {
          name: '蒙牛纯牛奶',
          category: '乳制品',
          shelfLife: 7,
          description: '常温保存，开封后请冷藏'
        },
        '6922255451234': {
          name: '康师傅方便面',
          category: '方便食品',
          shelfLife: 180,
          description: '干燥阴凉处保存'
        }
      }
      
      const product = mockProducts[code]
      if (product) {
        const expireDate = new Date()
        expireDate.setDate(expireDate.getDate() + product.shelfLife)
        
        return {
          name: product.name,
          category: product.category,
          expireDate: expireDate.getTime(),
          description: product.description,
          confidence: 0.9
        }
      }
      
      return null
    } catch (error) {
      console.error('条形码识别失败:', error)
      return null
    }
  }

  // OCR图像识别
  async recognizeImage(imagePath) {
    try {
      // 调用微信OCR插件
      const plugin = requirePlugin('ocr-plugin')
      
      return new Promise((resolve, reject) => {
        plugin.ocr({
          path: imagePath,
          success: (res) => {
            const result = this.parseOcrResult(res)
            resolve(result)
          },
          fail: (error) => {
            console.error('OCR识别失败:', error)
            reject(error)
          }
        })
      })
    } catch (error) {
      console.error('图像识别失败:', error)
      return null
    }
  }

  // 解析OCR结果
  parseOcrResult(ocrData) {
    try {
      const result = {
        productName: '',
        expireDate: null,
        productionDate: null,
        shelfLife: null
      }
      
      // 提取文本内容
      const texts = ocrData.results.map(item => item.text).join(' ')
      
      // 提取商品名称（通常在前几行）
      const nameMatch = texts.match(/^[\u4e00-\u9fa5a-zA-Z0-9\s]{2,20}/)
      if (nameMatch) {
        result.productName = nameMatch[0].trim()
      }
      
      // 提取日期信息
      const datePatterns = [
        /保质期[至到]?[:：]?\s*(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/,
        /有效期[至到]?[:：]?\s*(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/,
        /到期日[:：]?\s*(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/,
        /(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/
      ]
      
      for (const pattern of datePatterns) {
        const match = texts.match(pattern)
        if (match) {
          const year = parseInt(match[1])
          const month = parseInt(match[2])
          const day = parseInt(match[3])
          
          if (year > 2020 && year < 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            result.expireDate = new Date(year, month - 1, day).getTime()
            break
          }
        }
      }
      
      // 提取生产日期
      const productionPatterns = [
        /生产日期[:：]?\s*(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/,
        /制造日期[:：]?\s*(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})[日]?/
      ]
      
      for (const pattern of productionPatterns) {
        const match = texts.match(pattern)
        if (match) {
          const year = parseInt(match[1])
          const month = parseInt(match[2])
          const day = parseInt(match[3])
          
          if (year > 2020 && year < 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            result.productionDate = new Date(year, month - 1, day).getTime()
            break
          }
        }
      }
      
      // 提取保质期天数
      const shelfLifeMatch = texts.match(/保质期[:：]?\s*(\d+)\s*[天日]/)
      if (shelfLifeMatch) {
        result.shelfLife = parseInt(shelfLifeMatch[1])
        
        // 如果有生产日期但没有到期日期，计算到期日期
        if (result.productionDate && !result.expireDate) {
          const expireDate = new Date(result.productionDate)
          expireDate.setDate(expireDate.getDate() + result.shelfLife)
          result.expireDate = expireDate.getTime()
        }
      }
      
      return result
    } catch (error) {
      console.error('解析OCR结果失败:', error)
      return null
    }
  }

  // 生成相关建议
  async generateRelatedSuggestions(reminder) {
    try {
      const suggestions = []
      
      // 1. 基于分类的建议
      const categoryId = reminder.categoryId
      const categorySuggestions = this.getCategorySuggestions(categoryId, reminder)
      suggestions.push(...categorySuggestions)
      
      // 2. 基于状态的建议
      const statusSuggestions = this.getStatusSuggestions(reminder)
      suggestions.push(...statusSuggestions)
      
      // 3. 基于时间的建议
      const timeSuggestions = this.getTimeSuggestions(reminder)
      suggestions.push(...timeSuggestions)
      
      return suggestions.slice(0, 5) // 最多返回5个建议
    } catch (error) {
      console.error('生成相关建议失败:', error)
      return []
    }
  }

  // 基于分类的建议
  getCategorySuggestions(categoryId, reminder) {
    const suggestions = []
    
    // 根据分类提供相关建议
    switch (categoryId) {
      case 1: // 食品
        suggestions.push({
          id: 'food_storage',
          type: 'create',
          icon: '🥛',
          title: '添加其他食品提醒',
          description: '牛奶、面包、蔬菜等',
          data: {
            categoryId: 1,
            remindDays: 2
          }
        })
        break
        
      case 2: // 药品
        suggestions.push({
          id: 'medicine_check',
          type: 'create',
          icon: '💊',
          title: '定期检查药箱',
          description: '建议每月检查一次',
          data: {
            title: '检查药箱',
            categoryId: 2,
            remindDays: 7,
            repeatType: 'monthly'
          }
        })
        break
        
      case 5: // 重要事务
        if (reminder.title.includes('还款')) {
          suggestions.push({
            id: 'payment_reminder',
            type: 'modify',
            icon: '💳',
            title: '设置重复提醒',
            description: '每月自动提醒还款',
            data: {
              repeatType: 'monthly'
            }
          })
        }
        break
    }
    
    return suggestions
  }

  // 基于状态的建议
  getStatusSuggestions(reminder) {
    const suggestions = []
    
    if (reminder.status === 'expired') {
      suggestions.push({
        id: 'extend_deadline',
        type: 'modify',
        icon: '⏰',
        title: '延期提醒',
        description: '延长到期时间',
        data: {
          expireDate: Date.now() + 7 * 24 * 60 * 60 * 1000 // 延期7天
        }
      })
    }
    
    if (reminder.status === 'warning') {
      suggestions.push({
        id: 'increase_remind_days',
        type: 'modify',
        icon: '🔔',
        title: '增加提醒频率',
        description: '提前更多天提醒',
        data: {
          remindDays: reminder.remindDays + 2
        }
      })
    }
    
    return suggestions
  }

  // 基于时间的建议
  getTimeSuggestions(reminder) {
    const suggestions = []
    const now = new Date()
    const expireDate = new Date(reminder.expireDate)
    const daysDiff = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 30 && reminder.repeatType === 'none') {
      suggestions.push({
        id: 'set_repeat',
        type: 'modify',
        icon: '🔄',
        title: '设置重复提醒',
        description: '定期重复此类提醒',
        data: {
          repeatType: 'monthly'
        }
      })
    }
    
    return suggestions
  }

  // 学习用户行为
  async learnUserBehavior(reminder, userAction) {
    try {
      const learningData = wx.getStorageSync('userLearningData') || {
        preferences: {},
        patterns: {},
        corrections: []
      }
      
      // 记录用户偏好
      const key = `${reminder.categoryId}_${reminder.title}`
      if (!learningData.preferences[key]) {
        learningData.preferences[key] = {
          remindDays: [],
          expireDays: [],
          actions: []
        }
      }
      
      learningData.preferences[key].actions.push({
        action: userAction,
        timestamp: Date.now(),
        remindDays: reminder.remindDays,
        actualExpireDays: Math.ceil((reminder.expireDate - reminder.createTime) / (1000 * 60 * 60 * 24))
      })
      
      // 记录修正信息
      if (userAction === 'modify_date' || userAction === 'modify_remind_days') {
        learningData.corrections.push({
          originalTitle: reminder.title,
          originalRemindDays: reminder.remindDays,
          newRemindDays: reminder.remindDays,
          timestamp: Date.now()
        })
      }
      
      wx.setStorageSync('userLearningData', learningData)
      
    } catch (error) {
      console.error('学习用户行为失败:', error)
    }
  }

  // 获取个性化建议
  async getPersonalizedSuggestions(title) {
    try {
      const learningData = wx.getStorageSync('userLearningData') || {
        preferences: {},
        patterns: {},
        corrections: []
      }
      
      const suggestions = []
      
      // 查找相似的历史记录
      Object.keys(learningData.preferences).forEach(key => {
        if (key.includes(title) || title.includes(key.split('_')[1])) {
          const preference = learningData.preferences[key]
          const avgRemindDays = Math.round(
            preference.remindDays.reduce((sum, days) => sum + days, 0) / preference.remindDays.length
          )
          
          suggestions.push({
            remindDays: avgRemindDays,
            confidence: 0.8,
            source: 'personalized'
          })
        }
      })
      
      return suggestions
    } catch (error) {
      console.error('获取个性化建议失败:', error)
      return []
    }
  }
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService