// utils/statisticsService.js
// 统计服务 - 提供数据统计和分析功能

const dateUtils = require('./dateUtils')

class StatisticsService {
  constructor() {
    this.cacheTimeout = 5 * 60 * 1000 // 5分钟缓存
    this.cache = new Map()
  }

  // 获取基础统计数据
  async getBasicStats() {
    const cacheKey = 'basicStats'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const reminders = wx.getStorageSync('reminders') || []
      const now = new Date()
      
      const stats = {
        total: reminders.length,
        expired: 0,
        warning: 0,
        normal: 0,
        completed: 0,
        categories: {},
        priorities: { high: 0, medium: 0, low: 0 },
        thisWeek: 0,
        thisMonth: 0,
        avgRemindDays: 0
      }
      
      let totalRemindDays = 0
      
      reminders.forEach(reminder => {
        const expireDate = new Date(reminder.expireDate)
        const daysDiff = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
        
        // 状态统计
        if (reminder.status === 'completed') {
          stats.completed++
        } else if (daysDiff < 0) {
          stats.expired++
        } else if (daysDiff <= reminder.remindDays) {
          stats.warning++
        } else {
          stats.normal++
        }
        
        // 分类统计
        const categoryId = reminder.categoryId || 1
        stats.categories[categoryId] = (stats.categories[categoryId] || 0) + 1
        
        // 优先级统计
        const priority = reminder.priority || 'medium'
        stats.priorities[priority]++
        
        // 时间范围统计
        if (dateUtils.isThisWeek(expireDate)) {
          stats.thisWeek++
        }
        if (dateUtils.isThisMonth(expireDate)) {
          stats.thisMonth++
        }
        
        totalRemindDays += reminder.remindDays || 3
      })
      
      // 计算平均提醒天数
      stats.avgRemindDays = reminders.length > 0 ? 
        Math.round(totalRemindDays / reminders.length) : 0
      
      this.setCache(cacheKey, stats)
      return stats
    } catch (error) {
      console.error('获取基础统计失败:', error)
      return this.getDefaultStats()
    }
  }

  // 获取趋势统计
  async getTrendStats(period = 'week') {
    const cacheKey = `trendStats_${period}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const reminders = wx.getStorageSync('reminders') || []
      const now = new Date()
      
      let startDate, dateFormat, groupBy
      
      switch (period) {
        case 'week':
          startDate = dateUtils.addDays(now, -7)
          dateFormat = 'MM-DD'
          groupBy = 'day'
          break
        case 'month':
          startDate = dateUtils.addDays(now, -30)
          dateFormat = 'MM-DD'
          groupBy = 'day'
          break
        case 'year':
          startDate = dateUtils.addMonths(now, -12)
          dateFormat = 'YYYY-MM'
          groupBy = 'month'
          break
        default:
          startDate = dateUtils.addDays(now, -7)
          dateFormat = 'MM-DD'
          groupBy = 'day'
      }
      
      const trendData = this.generateTrendData(reminders, startDate, now, dateFormat, groupBy)
      
      this.setCache(cacheKey, trendData)
      return trendData
    } catch (error) {
      console.error('获取趋势统计失败:', error)
      return { labels: [], datasets: [] }
    }
  }

  // 生成趋势数据
  generateTrendData(reminders, startDate, endDate, dateFormat, groupBy) {
    const dataMap = new Map()
    const labels = []
    
    // 初始化时间标签
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const label = dateUtils.formatDate(currentDate, dateFormat)
      labels.push(label)
      dataMap.set(label, {
        created: 0,
        expired: 0,
        completed: 0
      })
      
      if (groupBy === 'day') {
        currentDate = dateUtils.addDays(currentDate, 1)
      } else {
        currentDate = dateUtils.addMonths(currentDate, 1)
      }
    }
    
    // 统计数据
    reminders.forEach(reminder => {
      const createDate = new Date(reminder.createTime)
      const expireDate = new Date(reminder.expireDate)
      
      // 创建统计
      if (createDate >= startDate && createDate <= endDate) {
        const createLabel = dateUtils.formatDate(createDate, dateFormat)
        if (dataMap.has(createLabel)) {
          dataMap.get(createLabel).created++
        }
      }
      
      // 过期统计
      if (expireDate >= startDate && expireDate <= endDate && expireDate < new Date()) {
        const expireLabel = dateUtils.formatDate(expireDate, dateFormat)
        if (dataMap.has(expireLabel)) {
          dataMap.get(expireLabel).expired++
        }
      }
      
      // 完成统计
      if (reminder.status === 'completed' && reminder.completeTime) {
        const completeDate = new Date(reminder.completeTime)
        if (completeDate >= startDate && completeDate <= endDate) {
          const completeLabel = dateUtils.formatDate(completeDate, dateFormat)
          if (dataMap.has(completeLabel)) {
            dataMap.get(completeLabel).completed++
          }
        }
      }
    })
    
    // 转换为图表数据格式
    const datasets = [
      {
        label: '新增',
        data: labels.map(label => dataMap.get(label).created),
        color: '#1890ff',
        type: 'line'
      },
      {
        label: '过期',
        data: labels.map(label => dataMap.get(label).expired),
        color: '#ff4d4f',
        type: 'bar'
      },
      {
        label: '完成',
        data: labels.map(label => dataMap.get(label).completed),
        color: '#52c41a',
        type: 'bar'
      }
    ]
    
    return { labels, datasets }
  }

  // 获取分类统计
  async getCategoryStats() {
    const cacheKey = 'categoryStats'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const reminders = wx.getStorageSync('reminders') || []
      const categories = wx.getStorageSync('categories') || []
      
      const categoryMap = new Map()
      categories.forEach(cat => {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          total: 0,
          expired: 0,
          warning: 0,
          normal: 0,
          completed: 0,
          avgRemindDays: 0
        })
      })
      
      const now = new Date()
      
      reminders.forEach(reminder => {
        const categoryId = reminder.categoryId || 1
        if (!categoryMap.has(categoryId)) return
        
        const categoryStats = categoryMap.get(categoryId)
        const expireDate = new Date(reminder.expireDate)
        const daysDiff = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
        
        categoryStats.total++
        
        if (reminder.status === 'completed') {
          categoryStats.completed++
        } else if (daysDiff < 0) {
          categoryStats.expired++
        } else if (daysDiff <= reminder.remindDays) {
          categoryStats.warning++
        } else {
          categoryStats.normal++
        }
        
        categoryStats.avgRemindDays += reminder.remindDays || 3
      })
      
      // 计算平均值并转换为数组
      const result = Array.from(categoryMap.values())
        .filter(cat => cat.total > 0)
        .map(cat => ({
          ...cat,
          avgRemindDays: Math.round(cat.avgRemindDays / cat.total),
          percentage: 0 // 将在后面计算
        }))
        .sort((a, b) => b.total - a.total)
      
      // 计算百分比
      const totalReminders = result.reduce((sum, cat) => sum + cat.total, 0)
      result.forEach(cat => {
        cat.percentage = totalReminders > 0 ? 
          Math.round((cat.total / totalReminders) * 100) : 0
      })
      
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error('获取分类统计失败:', error)
      return []
    }
  }

  // 获取使用习惯分析
  async getUsageAnalysis() {
    const cacheKey = 'usageAnalysis'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const reminders = wx.getStorageSync('reminders') || []
      const now = new Date()
      
      const analysis = {
        // 时间偏好
        timePreferences: {
          morning: 0,   // 6-12
          afternoon: 0, // 12-18
          evening: 0,   // 18-24
          night: 0      // 0-6
        },
        
        // 提醒天数偏好
        remindDaysPreference: {
          immediate: 0, // 0-1天
          short: 0,     // 2-3天
          medium: 0,    // 4-7天
          long: 0       // 8天以上
        },
        
        // 完成率
        completionRate: {
          overall: 0,
          thisWeek: 0,
          thisMonth: 0
        },
        
        // 活跃度
        activity: {
          dailyAvg: 0,
          weeklyAvg: 0,
          monthlyAvg: 0,
          peakHour: 0,
          peakDay: 0
        },
        
        // 使用模式
        patterns: {
          mostUsedCategory: null,
          avgItemsPerDay: 0,
          preferredRemindTime: null
        }
      }
      
      if (reminders.length === 0) {
        this.setCache(cacheKey, analysis)
        return analysis
      }
      
      // 分析时间偏好
      const hourCounts = new Array(24).fill(0)
      const dayCounts = new Array(7).fill(0)
      
      reminders.forEach(reminder => {
        const createDate = new Date(reminder.createTime)
        const hour = createDate.getHours()
        const day = createDate.getDay()
        
        hourCounts[hour]++
        dayCounts[day]++
        
        // 时间段统计
        if (hour >= 6 && hour < 12) {
          analysis.timePreferences.morning++
        } else if (hour >= 12 && hour < 18) {
          analysis.timePreferences.afternoon++
        } else if (hour >= 18 && hour < 24) {
          analysis.timePreferences.evening++
        } else {
          analysis.timePreferences.night++
        }
        
        // 提醒天数偏好
        const remindDays = reminder.remindDays || 3
        if (remindDays <= 1) {
          analysis.remindDaysPreference.immediate++
        } else if (remindDays <= 3) {
          analysis.remindDaysPreference.short++
        } else if (remindDays <= 7) {
          analysis.remindDaysPreference.medium++
        } else {
          analysis.remindDaysPreference.long++
        }
      })
      
      // 计算完成率
      const completedCount = reminders.filter(r => r.status === 'completed').length
      analysis.completionRate.overall = Math.round((completedCount / reminders.length) * 100)
      
      const thisWeekReminders = reminders.filter(r => dateUtils.isThisWeek(r.createTime))
      const thisWeekCompleted = thisWeekReminders.filter(r => r.status === 'completed').length
      analysis.completionRate.thisWeek = thisWeekReminders.length > 0 ? 
        Math.round((thisWeekCompleted / thisWeekReminders.length) * 100) : 0
      
      const thisMonthReminders = reminders.filter(r => dateUtils.isThisMonth(r.createTime))
      const thisMonthCompleted = thisMonthReminders.filter(r => r.status === 'completed').length
      analysis.completionRate.thisMonth = thisMonthReminders.length > 0 ? 
        Math.round((thisMonthCompleted / thisMonthReminders.length) * 100) : 0
      
      // 计算活跃度
      const oldestReminder = reminders.reduce((oldest, current) => 
        current.createTime < oldest.createTime ? current : oldest, reminders[0])
      const daysSinceFirst = dateUtils.daysBetween(oldestReminder.createTime, now)
      
      analysis.activity.dailyAvg = daysSinceFirst > 0 ? 
        Math.round((reminders.length / daysSinceFirst) * 10) / 10 : 0
      analysis.activity.weeklyAvg = Math.round(analysis.activity.dailyAvg * 7 * 10) / 10
      analysis.activity.monthlyAvg = Math.round(analysis.activity.dailyAvg * 30 * 10) / 10
      
      // 找出峰值时间
      analysis.activity.peakHour = hourCounts.indexOf(Math.max(...hourCounts))
      analysis.activity.peakDay = dayCounts.indexOf(Math.max(...dayCounts))
      
      // 分析使用模式
      const categoryStats = await this.getCategoryStats()
      if (categoryStats.length > 0) {
        analysis.patterns.mostUsedCategory = categoryStats[0]
      }
      
      analysis.patterns.avgItemsPerDay = analysis.activity.dailyAvg
      analysis.patterns.preferredRemindTime = `${analysis.activity.peakHour}:00`
      
      this.setCache(cacheKey, analysis)
      return analysis
    } catch (error) {
      console.error('获取使用习惯分析失败:', error)
      return this.getDefaultUsageAnalysis()
    }
  }

  // 获取效率报告
  async getEfficiencyReport() {
    try {
      const reminders = wx.getStorageSync('reminders') || []
      const now = new Date()
      
      const report = {
        score: 0,
        level: 'beginner',
        insights: [],
        recommendations: [],
        achievements: [],
        metrics: {
          onTimeCompletion: 0,
          avgResponseTime: 0,
          proactiveRate: 0,
          consistencyScore: 0
        }
      }
      
      if (reminders.length === 0) {
        report.insights.push('还没有足够的数据来生成效率报告')
        return report
      }
      
      // 计算按时完成率
      const completedReminders = reminders.filter(r => r.status === 'completed')
      const onTimeCompleted = completedReminders.filter(r => {
        const completeTime = new Date(r.completeTime)
        const expireTime = new Date(r.expireDate)
        return completeTime <= expireTime
      })
      
      report.metrics.onTimeCompletion = completedReminders.length > 0 ? 
        Math.round((onTimeCompleted.length / completedReminders.length) * 100) : 0
      
      // 计算平均响应时间
      const responseTimes = completedReminders
        .filter(r => r.completeTime && r.notifyTime)
        .map(r => {
          const completeTime = new Date(r.completeTime)
          const notifyTime = new Date(r.notifyTime)
          return Math.max(0, completeTime - notifyTime)
        })
      
      report.metrics.avgResponseTime = responseTimes.length > 0 ? 
        Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60 * 60)) : 0
      
      // 计算主动性评分
      const proactiveActions = reminders.filter(r => {
        const createTime = new Date(r.createTime)
        const expireTime = new Date(r.expireDate)
        const daysDiff = dateUtils.daysBetween(createTime, expireTime)
        return daysDiff > (r.remindDays || 3)
      })
      
      report.metrics.proactiveRate = Math.round((proactiveActions.length / reminders.length) * 100)
      
      // 计算一致性评分
      const recentWeeks = 4
      const weeklyActivity = []
      for (let i = 0; i < recentWeeks; i++) {
        const weekStart = dateUtils.addDays(now, -7 * (i + 1))
        const weekEnd = dateUtils.addDays(weekStart, 7)
        const weekReminders = reminders.filter(r => {
          const createTime = new Date(r.createTime)
          return createTime >= weekStart && createTime < weekEnd
        })
        weeklyActivity.push(weekReminders.length)
      }
      
      const avgWeeklyActivity = weeklyActivity.reduce((sum, count) => sum + count, 0) / recentWeeks
      const variance = weeklyActivity.reduce((sum, count) => sum + Math.pow(count - avgWeeklyActivity, 2), 0) / recentWeeks
      report.metrics.consistencyScore = Math.max(0, 100 - Math.round(Math.sqrt(variance) * 10))
      
      // 计算综合评分
      report.score = Math.round((
        report.metrics.onTimeCompletion * 0.3 +
        Math.max(0, 100 - report.metrics.avgResponseTime) * 0.2 +
        report.metrics.proactiveRate * 0.3 +
        report.metrics.consistencyScore * 0.2
      ))
      
      // 确定等级
      if (report.score >= 90) {
        report.level = 'expert'
      } else if (report.score >= 70) {
        report.level = 'advanced'
      } else if (report.score >= 50) {
        report.level = 'intermediate'
      } else {
        report.level = 'beginner'
      }
      
      // 生成洞察和建议
      this.generateInsightsAndRecommendations(report, reminders)
      
      return report
    } catch (error) {
      console.error('获取效率报告失败:', error)
      return this.getDefaultEfficiencyReport()
    }
  }

  // 生成洞察和建议
  generateInsightsAndRecommendations(report, reminders) {
    const insights = []
    const recommendations = []
    
    // 按时完成率分析
    if (report.metrics.onTimeCompletion >= 80) {
      insights.push('您的按时完成率很高，时间管理能力出色')
    } else if (report.metrics.onTimeCompletion >= 60) {
      insights.push('您的按时完成率中等，还有提升空间')
      recommendations.push('建议适当提前提醒时间，给自己更多缓冲')
    } else {
      insights.push('您的按时完成率较低，需要改善时间规划')
      recommendations.push('建议重新评估任务的紧急程度和所需时间')
    }
    
    // 响应时间分析
    if (report.metrics.avgResponseTime <= 2) {
      insights.push('您对提醒的响应很及时')
    } else if (report.metrics.avgResponseTime <= 24) {
      insights.push('您的响应时间适中')
      recommendations.push('可以尝试设置更频繁的提醒来提高响应速度')
    } else {
      insights.push('您的响应时间较长，可能错过了一些重要事项')
      recommendations.push('建议开启推送通知，确保及时收到提醒')
    }
    
    // 主动性分析
    if (report.metrics.proactiveRate >= 70) {
      insights.push('您很有前瞻性，经常提前规划')
    } else if (report.metrics.proactiveRate >= 40) {
      insights.push('您有一定的前瞻性，但可以更主动一些')
      recommendations.push('尝试为重要事项设置更长的提醒周期')
    } else {
      insights.push('您倾向于临时处理事务，建议增强前瞻性')
      recommendations.push('养成提前规划的习惯，为重要事项留出充足时间')
    }
    
    // 一致性分析
    if (report.metrics.consistencyScore >= 80) {
      insights.push('您的使用习惯很稳定，保持得很好')
    } else if (report.metrics.consistencyScore >= 60) {
      insights.push('您的使用习惯比较稳定')
      recommendations.push('尝试建立固定的检查和添加提醒的时间')
    } else {
      insights.push('您的使用习惯不够稳定')
      recommendations.push('建议每天固定时间检查和管理提醒事项')
    }
    
    report.insights = insights
    report.recommendations = recommendations
  }

  // 缓存相关方法
  getFromCache(key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    return null
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clearCache() {
    this.cache.clear()
  }

  // 默认数据
  getDefaultStats() {
    return {
      total: 0,
      expired: 0,
      warning: 0,
      normal: 0,
      completed: 0,
      categories: {},
      priorities: { high: 0, medium: 0, low: 0 },
      thisWeek: 0,
      thisMonth: 0,
      avgRemindDays: 3
    }
  }

  getDefaultUsageAnalysis() {
    return {
      timePreferences: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      },
      remindDaysPreference: {
        immediate: 0,
        short: 0,
        medium: 0,
        long: 0
      },
      completionRate: {
        overall: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      activity: {
        dailyAvg: 0,
        weeklyAvg: 0,
        monthlyAvg: 0,
        peakHour: 9,
        peakDay: 1
      },
      patterns: {
        mostUsedCategory: null,
        avgItemsPerDay: 0,
        preferredRemindTime: '09:00'
      }
    }
  }

  getDefaultEfficiencyReport() {
    return {
      score: 0,
      level: 'beginner',
      insights: ['暂无足够数据生成报告'],
      recommendations: ['开始添加提醒事项来获得个性化建议'],
      achievements: [],
      metrics: {
        onTimeCompletion: 0,
        avgResponseTime: 0,
        proactiveRate: 0,
        consistencyScore: 0
      }
    }
  }

  // 导出统计数据
  async exportStats() {
    try {
      const basicStats = await this.getBasicStats()
      const categoryStats = await this.getCategoryStats()
      const usageAnalysis = await this.getUsageAnalysis()
      const efficiencyReport = await this.getEfficiencyReport()
      
      const exportData = {
        exportTime: new Date().toISOString(),
        basicStats,
        categoryStats,
        usageAnalysis,
        efficiencyReport
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('导出统计数据失败:', error)
      throw error
    }
  }
}

// 创建单例实例
const statisticsService = new StatisticsService()

module.exports = statisticsService