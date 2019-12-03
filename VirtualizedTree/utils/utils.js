/**
 * 字符计算
 * @param {内容} str 
 */
export function charCount(str) {
  return str && str.replace(/[^\x00-\xff]/g,"x").length || 0;
}

/**
 * 统计字符在字符串中出现次数
 * @param {字符串} str 
 * @param {字符} char 
 */
export function countCharExist(str, char) {
  const re = eval("/" + char + "/ig")
  return str.match(re) ? str.match(re).length : 0;
}