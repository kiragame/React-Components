export default class Dictionary {

  // 数据存储
  warehouse = {};

  /**
   * 向字典添加词库
   * @param rawStr 待切割字符串
   * @param index 该字符串的索引
   */
  addWord = (rawStr, index) => {
    if (!rawStr || rawStr === '') {
      return;
    }
    const perWords = rawStr.split('');
    const pLen = perWords.length;

    // 分词
    for (let i = 0; i < pLen; i ++) {
      for (let j = 0; j < pLen; j ++) {
        const tmp = perWords.slice(i, j).join('');
        if (!this.warehouse[tmp]) {
          this.warehouse[tmp] = new Set();
        }
        this.warehouse[tmp].add(index);
      }
    }
  }

  /**
   * 获取相关索引
   * @param rawStr 搜索词
   */
  getIndex = (rawStr) => {
    return Array.from(this.warehouse[rawStr] || []);
  }
}