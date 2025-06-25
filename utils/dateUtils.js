// utils/dateUtils.js
// 日期工具类 - 提供日期格式化、计算和处理功能

class DateUtils {
  constructor() {
    this.weekdays = ['日', '一', '二', '三', '四', '五', '六']
    this.months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  }

  // 格式化日期
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return ''
    
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hour = d.getHours()
    const minute = d.getMinutes()
    const second = d.getSeconds()
    const weekday = d.getDay()
    
    const formatMap = {
      'YYYY': year,
      'YY': String(year).slice(-2),
      'MM': String(month).padStart(2, '0'),
      'M': month,
      'DD': String(day).padStart(2, '0'),
      'D': day,
      'HH': String(hour).padStart(2, '0'),
      'H': hour,
      'mm': String(minute).padStart(2, '0'),
      'm': minute,
      'ss': String(second).padStart(2, '0'),
      's': second,
      'W': this.weekdays[weekday]
    }
    
    let result = format
    Object.keys(formatMap).forEach(key => {
      result = result.replace(new RegExp(key, 'g'), formatMap[key])
    })
    
    return result
  }

  // 格式化相对时间
  formatRelativeTime(date) {
    if (!date) return ''
    
    const now = new Date()
    const target = new Date(date)
    const diff = target.getTime() - now.getTime()
    const absDiff = Math.abs(diff)
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day
    
    if (absDiff < minute) {
      return '刚刚'
    } else if (absDiff < hour) {
      const minutes = Math.floor(absDiff / minute)
      return diff > 0 ? `${minutes}分钟后` : `${minutes}分钟前`
    } else if (absDiff < day) {
      const hours = Math.floor(absDiff / hour)
      return diff > 0 ? `${hours}小时后` : `${hours}小时前`
    } else if (absDiff < week) {
      const days = Math.floor(absDiff / day)
      if (days === 1) {
        return diff > 0 ? '明天' : '昨天'
      } else if (days === 2) {
        return diff > 0 ? '后天' : '前天'
      } else {
        return diff > 0 ? `${days}天后` : `${days}天前`
      }
    } else if (absDiff < month) {
      const weeks = Math.floor(absDiff / week)
      return diff > 0 ? `${weeks}周后` : `${weeks}周前`
    } else if (absDiff < year) {
      const months = Math.floor(absDiff / month)
      return diff > 0 ? `${months}个月后` : `${months}个月前`
    } else {
      const years = Math.floor(absDiff / year)
      return diff > 0 ? `${years}年后` : `${years}年前`
    }
  }

  // 计算剩余时间
  calculateTimeRemaining(expireDate) {
    const now = new Date()
    const expire = new Date(expireDate)
    const diff = expire.getTime() - now.getTime()
    
    if (diff <= 0) {
      return {
        isExpired: true,
        days: 0,
        hours: 0,
        minutes: 0,
        text: '已过期'
      }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    let text = ''
    if (days > 0) {
      text = `${days}天`
      if (days <= 3 && hours > 0) {
        text += `${hours}小时`
      }
    } else if (hours > 0) {
      text = `${hours}小时`
      if (hours <= 6 && minutes > 0) {
        text += `${minutes}分钟`
      }
    } else {
      text = `${minutes}分钟`
    }
    
    return {
      isExpired: false,
      days,
      hours,
      minutes,
      text: text + '后到期'
    }
  }

  // 判断是否为今天
  isToday(date) {
    const today = new Date()
    const target = new Date(date)
    
    return today.getFullYear() === target.getFullYear() &&
           today.getMonth() === target.getMonth() &&
           today.getDate() === target.getDate()
  }

  // 判断是否为明天
  isTomorrow(date) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const target = new Date(date)
    
    return tomorrow.getFullYear() === target.getFullYear() &&
           tomorrow.getMonth() === target.getMonth() &&
           tomorrow.getDate() === target.getDate()
  }

  // 判断是否为本周
  isThisWeek(date) {
    const now = new Date()
    const target = new Date(date)
    
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return target >= startOfWeek && target <= endOfWeek
  }

  // 判断是否为本月
  isThisMonth(date) {
    const now = new Date()
    const target = new Date(date)
    
    return now.getFullYear() === target.getFullYear() &&
           now.getMonth() === target.getMonth()
  }

  // 获取日期范围的描述
  getDateRangeDescription(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (this.isSameDay(start, end)) {
      if (this.isToday(start)) {
        return '今天'
      } else if (this.isTomorrow(start)) {
        return '明天'
      } else {
        return this.formatDate(start, 'MM月DD日')
      }
    }
    
    const startStr = this.formatDate(start, 'MM月DD日')
    const endStr = this.formatDate(end, 'MM月DD日')
    
    return `${startStr} - ${endStr}`
  }

  // 判断是否为同一天
  isSameDay(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  // 获取月份的天数
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
  }

  // 获取周的开始日期
  getStartOfWeek(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    
    const startOfWeek = new Date(d.setDate(diff))
    startOfWeek.setHours(0, 0, 0, 0)
    
    return startOfWeek
  }

  // 获取月的开始日期
  getStartOfMonth(date) {
    const d = new Date(date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  // 获取年的开始日期
  getStartOfYear(date) {
    const d = new Date(date)
    return new Date(d.getFullYear(), 0, 1)
  }

  // 添加天数
  addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // 添加月数
  addMonths(date, months) {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  // 添加年数
  addYears(date, years) {
    const result = new Date(date)
    result.setFullYear(result.getFullYear() + years)
    return result
  }

  // 计算两个日期之间的天数
  daysBetween(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const timeDiff = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  // 获取日期的时间戳（去除时分秒）
  getDateTimestamp(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  // 解析日期字符串
  parseDate(dateString) {
    if (!dateString) return null
    
    // 支持多种日期格式
    const formats = [
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/,  // YYYY-MM-DD 或 YYYY/MM/DD
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/,  // MM-DD-YYYY 或 MM/DD/YYYY
      /^(\d{4})(\d{2})(\d{2})$/,                // YYYYMMDD
      /^(\d{1,2})月(\d{1,2})日$/,               // MM月DD日
      /^(\d{4})年(\d{1,2})月(\d{1,2})日$/       // YYYY年MM月DD日
    ]
    
    for (let i = 0; i < formats.length; i++) {
      const match = dateString.match(formats[i])
      if (match) {
        let year, month, day
        
        switch (i) {
          case 0: // YYYY-MM-DD
          case 2: // YYYYMMDD
          case 4: // YYYY年MM月DD日
            year = parseInt(match[1])
            month = parseInt(match[2]) - 1
            day = parseInt(match[3])
            break
          case 1: // MM-DD-YYYY
            month = parseInt(match[1]) - 1
            day = parseInt(match[2])
            year = parseInt(match[3])
            break
          case 3: // MM月DD日
            const currentYear = new Date().getFullYear()
            year = currentYear
            month = parseInt(match[1]) - 1
            day = parseInt(match[2])
            break
        }
        
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
    
    // 尝试使用原生解析
    const nativeDate = new Date(dateString)
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate
    }
    
    return null
  }

  // 获取友好的日期显示
  getFriendlyDate(date) {
    if (!date) return ''
    
    const target = new Date(date)
    const now = new Date()
    
    if (this.isToday(target)) {
      return '今天'
    } else if (this.isTomorrow(target)) {
      return '明天'
    } else if (this.isThisWeek(target)) {
      return `周${this.weekdays[target.getDay()]}`
    } else if (this.isThisMonth(target)) {
      return this.formatDate(target, 'DD日')
    } else if (target.getFullYear() === now.getFullYear()) {
      return this.formatDate(target, 'MM月DD日')
    } else {
      return this.formatDate(target, 'YYYY年MM月DD日')
    }
  }

  // 获取时间段描述
  getTimeRangeDescription(startTime, endTime) {
    const start = this.formatDate(new Date(startTime), 'HH:mm')
    const end = this.formatDate(new Date(endTime), 'HH:mm')
    return `${start} - ${end}`
  }

  // 验证日期是否有效
  isValidDate(date) {
    if (!date) return false
    const d = new Date(date)
    return !isNaN(d.getTime())
  }

  // 获取日期的季度
  getQuarter(date) {
    const month = new Date(date).getMonth()
    return Math.floor(month / 3) + 1
  }

  // 获取农历信息（简化版）
  getLunarInfo(date) {
    // 这里可以集成农历转换库
    // 为了演示，返回简单的信息
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    
    // 简单的节气判断
    const solarTerms = {
      '2-4': '立春', '2-19': '雨水',
      '3-6': '惊蛰', '3-21': '春分',
      '4-5': '清明', '4-20': '谷雨',
      '5-6': '立夏', '5-21': '小满',
      '6-6': '芒种', '6-21': '夏至',
      '7-7': '小暑', '7-23': '大暑',
      '8-8': '立秋', '8-23': '处暑',
      '9-8': '白露', '9-23': '秋分',
      '10-8': '寒露', '10-23': '霜降',
      '11-7': '立冬', '11-22': '小雪',
      '12-7': '大雪', '12-22': '冬至',
      '1-6': '小寒', '1-20': '大寒'
    }
    
    const key = `${month}-${day}`
    const solarTerm = solarTerms[key]
    
    return {
      solarTerm: solarTerm || null,
      isTraditionalFestival: false // 可以扩展传统节日判断
    }
  }

  // 获取工作日信息
  getWorkdayInfo(date) {
    const d = new Date(date)
    const dayOfWeek = d.getDay()
    
    return {
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isWorkday: dayOfWeek >= 1 && dayOfWeek <= 5,
      dayName: this.weekdays[dayOfWeek]
    }
  }

  // 格式化持续时间
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}天${hours % 24}小时`
    } else if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`
    } else {
      return `${seconds}秒`
    }
  }
}

// 创建单例实例
const dateUtils = new DateUtils()

module.exports = dateUtils