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
    // const perWords = rawStr.split('');
    // const pLen = perWords.length;

    // // 分词
    // for (let i = 0; i < pLen; i ++) {
    //   for (let j = 0; j < pLen + 1; j ++) {
    //     const tmp = perWords.slice(i, j).join('');
    //     if (!this.warehouse[tmp]) {
    //       this.warehouse[tmp] = new Set();
    //     }
    //     this.warehouse[tmp].add(index);
    //   }
    // }

    if (!this.warehouse[rawStr]) {
      this.warehouse[rawStr] = new Set();
    }
    this.warehouse[rawStr] = this.warehouse[rawStr].add(index);
  }

  /**
   * 获取相关索引
   * @param rawStr 搜索词
   */
  getIndex = (rawStr) => {
    // return Array.from(this.warehouse[`${rawStr}`] || []);

    const retSet = new Set();
    Object.keys(this.warehouse).forEach(key => {
      if (key.length < rawStr.length) {
        return;
      }

      if (!key.includes(rawStr)) {
        return;
      }

      for (let s of this.warehouse[key]) {
        retSet.add(s);
      }
    });

    return Array.from(retSet);
  }
}