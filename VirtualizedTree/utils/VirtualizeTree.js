export default class VirtualizeTree {

  /** -------------------star 外部使用属性 star--------------------- */

  // 唯一标识属性名称
  rowKey = '';

  // 下级内容属性名称
  childKey = '';

  // 是否存在下级内容的判断
  hasChild = () => false;

  // 可见高度
  clientHeight = 0;

  // 行高
  rowHeight = 0;

  // 可见的序号
  vVirtualIndex = [];

  // 虚拟高度(请乘以单行高度再使用)
  virtualHeight = 1;

  /** -------------------star 外部使用属性END star--------------------- */

  /** -------------------star 内部使用属性 star--------------------- */

  // 记录parentTreekey: [ virtualIndex ]， 当且仅当parentTreeKey在展开列表时该index可展示
  __keyVirtualIndexMap = {};

  // 记录virtualIndex: {}
  __virtualIndexItemMap = {};

  // 记录rowKey: {item}
  __rowKeyItemMap = {};

  // 记录treeKey: {item}
  __treeKeyItemMap = {};

  // 记录treeKey: [subTreeKeys]
  __treeKeySubs = {};

  // 记录expandKey对应的虚拟树, eg: rawKeys: "root,root-1,root-1-3,root-2-2,root-3-3", filterKeys: "root,root-1,root-1-3", virtualTreeIndexes: [1,2,3]
  __virtualTree = { rawKeys: "", filterKeys: "", virtualTreeIndexes: [] };

  /** -------------------star 内部使用属性END star--------------------- */

  /** -------------------star 外部使用函数 star--------------------- */

  /**
   * 重置对象属性
   * @param rowKey 数据主键  eg: 'id'
   * @param childKey 下级数据键值  eg: 'child'
   * @param hasChild 是否存在下级的函数 (item) => boolean
   * @param clientHeight 视高
   * @param rowHeight 单行高度
   */
  initVirtualizeTree = (rowKey, childKey, hasChild = () => false, clientHeight, rowHeight) => {
    this.rowKey = rowKey;
    this.childKey = childKey;
    this.virtualIndexPre = {};
    this.vVirtualIndex = [];
    this.hasChild = hasChild;
    this.clientHeight = clientHeight;
    this.rowHeight = rowHeight;

    this.__keyVirtualIndexMap = {};
    this.__rowKeyItemMap = {};
  }

  /**
   * 【非纯函数】标注数据，添加 virtualIndex virtualLayer属性
   * @param nodeData 根节点数据
   */
  markData = (nodeData, virtualIndex = 1, virtualLayer = 1, root = 'root') => {
    // 节点不存在
    if (!nodeData || !nodeData[this.rowKey]) {
      return 0;
    } else {
      // ⭐为节点添加属性
      nodeData.virtualIndex = virtualIndex;
      nodeData.virtualLayer = virtualLayer;
      nodeData.key = nodeData[this.rowKey];
      nodeData.treeKey = `${root}-${nodeData[this.rowKey]}`;
      nodeData.childRowCount = 0;
      // ⭐为节点添加属性  end

      // 存储virtualIndex展示条件
      if (!this.__keyVirtualIndexMap[root]) {
        this.__keyVirtualIndexMap[root] = [];
      }
      this.__keyVirtualIndexMap[root].push(virtualIndex);

      // 存储virtualIndex与单条内容的映射
      this.__virtualIndexItemMap[nodeData.virtualIndex] = nodeData;
      // 存储rowKey与单条内容的映射
      this.__rowKeyItemMap[nodeData[this.rowKey]] = nodeData;
      // 存储treeKey与单条内容的映射
      this.__treeKeyItemMap[nodeData.treeKey] = nodeData;
      // 存储treeKey与下级treeKey的映射
      const pKeySplits = root.split('-');
      for (let tI = 0, pkLen = pKeySplits.length; tI < pkLen; tI ++) {
        const pKey = pKeySplits.slice(0, tI + 1).join('-');
        if (!this.__treeKeySubs[pKey]) {
          this.__treeKeySubs[pKey] = [];
        }
        this.__treeKeySubs[pKey].push(nodeData.treeKey);
      }
    }

    // 节点不含有子节点
    if (!this.hasChild(nodeData)) {
      return 1;
    }

    /** 计算子节点高度 */
    // 子节点总高
    let childRowCount = 0;
    // 上层节点高度
    let upperLayerCount = 0;
    for (let i = 0, len = nodeData[this.childKey].length; i < len; i ++) {
      const element = nodeData[this.childKey][i];
      upperLayerCount = this.markData(element, virtualIndex + childRowCount + 1, virtualLayer + 1, nodeData.treeKey);
      childRowCount += upperLayerCount;
    }
    // 更新子节点高度
    nodeData.childRowCount = childRowCount;

    // 子节点高度加上自身高度
    return childRowCount + 1;
  }

  /**
   * 获取列表形式的数据
   */
  getListData = () => {
    return Object.values(this.__rowKeyItemMap);
  }

  /**
   * TODO: 持续优化
   * 获取可展示的virtualIndex集合
   * @param expandedKeys 已展开节点的key值
   * @param scrollTop
   * @param clientHeight
   * @param rowHeight
   */
  getVisibleVirtualIndex = (expandedKeys, scrollTop) => {

    // 从第几个节点开始切割
    const startIndex = Math.ceil(scrollTop / this.rowHeight);

    // 切割数量
    let chairs = Math.ceil(this.clientHeight / this.rowHeight);

    // 记录可见index
    let visibleIndexes = [];

    // 若expandedKeys不含root，添加root
    let dealedExpandedKeys = [ ...expandedKeys ];
    if (!dealedExpandedKeys.includes('root')) {
      dealedExpandedKeys.unshift('root');
    }

    // 本次展开的款项与上次展开不一致； 则需要重新获取虚拟树
    const expandedKeysToStr = dealedExpandedKeys.sort().join(',');
    if (this.__virtualTree.rawKeys !== expandedKeysToStr) {

      // 清除父级未展开的key
      dealedExpandedKeys = this.__filterExpandedKeys(dealedExpandedKeys);

      // 将所有展开项加入可见index
      for (let i = 0, len = dealedExpandedKeys.length; i < len; i ++) {
        const key = dealedExpandedKeys[i];
        visibleIndexes.push(...(this.__keyVirtualIndexMap[key] || []));
      }
      // 序号排序
      visibleIndexes = visibleIndexes.sort((a, b) => a - b);

      // 记录至 this.__virtualTree
      this.__virtualTree.rawKeys = expandedKeysToStr;
      this.__virtualTree.filterKeys = dealedExpandedKeys.sort().join(',');
      this.__virtualTree.virtualTreeIndexes = visibleIndexes;
    } else {
      visibleIndexes = this.__virtualTree.virtualTreeIndexes;
    }

    // 重置虚拟高度
    this.virtualHeight = visibleIndexes.length;
    // 切割可见index
    visibleIndexes = visibleIndexes.slice(startIndex, startIndex + chairs, scrollTop);

    this.vVirtualIndex = visibleIndexes;
  }

  // 获取可见条目
  getVisibleItems = () => {
    return this.vVirtualIndex.map(index => this.__virtualIndexItemMap[index] || {});
  }

  /**
   * [check]
   * 树形点击勾选框
   * 获取 { 选中treekeys, 半选中treekeys }
   * @param checkOne 当前点击行的treeKey
   * @param checkedTreeKeys 已选treeKey列表
   * @param halfCheckedTreeKeys 半选treeKey列表
   */
  getCheckedTreeKeys = (checkOne, checkedTreeKeys, halfCheckedTreeKeys) => {
    // 选中项keys
    const checked = new Set(checkedTreeKeys);
    // 半选中项keys
    const halfChecked = new Set(halfCheckedTreeKeys);

    // 下级所有treeKey
    const subTreeKeys = this.__treeKeySubs[checkOne] || [];
    // 当前treeKey切割
    const treeKeySplit = checkOne.split('-');
    const treeKeySplitLen = treeKeySplit.length;

    // checkOne未在已选列表的处理
    if (!checked.has(checkOne)) {

      // 自身加入已选列表
      checked.add(checkOne);
      // 自身移除半选列表
      halfChecked.delete(checkOne);

      // 下级节点加入已选列表
      for (let i = 0, len = subTreeKeys.length; i < len; i ++) {
        const tK = subTreeKeys[i];
        checked.add(tK);
        halfChecked.delete(tK);
      }

      // 父级元素添加到halfCheck或check
      // 注：__treeKeyItemMap内无'root'
      // 从最近父节点开始处理，逐渐往上
      for (let i = treeKeySplitLen - 2; i >= 1; i --) {
        const pKey = treeKeySplit.slice(0, i + 1).join('-');
        const pRow = this.__treeKeyItemMap[pKey];

        // 该父级下已选中节点个数和该父级的子节点个数一致
        console.time('judge');
        if (Array.from(checked).filter(i => i.includes(`${pKey}-`)).length === pRow.childRowCount) {
          halfChecked.delete(pKey);
          checked.add(pKey);
        } else {
          checked.delete(pKey);
          halfChecked.add(pKey);
        }
        console.timeEnd('judge');
      }

    } else {

      // 自身移除已选列表
      checked.delete(checkOne);
      // 自身移除半选列表
      halfChecked.delete(checkOne);

      // 下级节点移除已选列表
      for (let i = 0, len = subTreeKeys.length; i < len; i ++) {
        const tK = subTreeKeys[i];
        checked.delete(tK);
        halfChecked.delete(tK);
      }

      // 父级元素添加到halfCheck或check
      // 注：不let i = 0; 因为__treeKeyItemMap内无'root'
      for (let i = 1; i < treeKeySplitLen - 1; i ++) {
        const pKey = treeKeySplit.slice(0, i + 1).join('-');
        checked.delete(pKey);
        halfChecked.delete(pKey);
      }
      for (let i = 1; i < treeKeySplitLen - 1; i ++) {
        const pKey = treeKeySplit.slice(0, i + 1).join('-');
        // 该父级下已选中节点个数不为空，则加入半选列表
        console.time('judge');
        if (Array.from(checked).filter(i => i.includes(`${pKey}-`)).length !== 0) {
          halfChecked.add(pKey);
        }
        console.timeEnd('judge');
      }
    }

    return {
      checkedTreeKeys: Array.from(checked),
      halfCheckedTreeKeys: Array.from(halfChecked),
    };
  }

  /**
   * 树形选中key转化为rowKey
   * @param checkedTreeKeys 已选treeKey列表
   * @param halfCheckedTreeKeys 半选treeKey列表
   */
  convertCheckedTreeKeysToRowKeys = (checkedTreeKeys, halfCheckedTreeKeys) => {
    // 选中项keys
    const checked = new Set();
    // 半选中项keys
    const halfChecked = new Set();
    // 选中项row
    const checkedRow = [];
    // 半选中row
    const halfCheckedRow = [];

    // 获取选中rowKey
    for (let i = 0, len = checkedTreeKeys.length; i < len; i ++) {
      const tmp = checkedTreeKeys[i];
      const lastIndexOfSplitChar = tmp.lastIndexOf('-');
      const tmpLen = tmp.length;
      checked.add(tmp.substring(lastIndexOfSplitChar + 1, tmpLen));
    }
    for (let i = 0, len = halfCheckedTreeKeys.length; i < len; i ++) {
      const tmp = halfCheckedTreeKeys[i];
      const lastIndexOfSplitChar = tmp.lastIndexOf('-');
      const tmpLen = tmp.length;
      halfChecked.add(tmp.substring(lastIndexOfSplitChar + 1, tmpLen));
    }

    // 写入row
    checked.forEach(i => {
      if (!this.__rowKeyItemMap[i]) {
        return;
      }
      checkedRow.push(this.__rowKeyItemMap[i]);
    });
    halfChecked.forEach(i => {
      if (!this.__rowKeyItemMap[i]) {
        return;
      }
      halfCheckedRow.push(this.__rowKeyItemMap[i]);
    })

    return {
      checkedKeys: Array.from(checked),
      halfCheckedKeys: Array.from(halfChecked),
      checkedRows: checkedRow,
      halfCheckedRows: halfCheckedRow,
    };
  }

  /**
   * rowKey转化为树形选中key
   * @param checkedKeys 已选rowKey列表
   */
  convertCheckedRowKeysToTreeKeys = (checkedKeys) => {
    const checkedTreeKeys = new Set();
    const halfCheckedTreeKeys = new Set();

    checkedKeys.filter(i => !!this.__rowKeyItemMap[i].treeKey).map(i => this.__rowKeyItemMap[i].treeKey).forEach(nTreeKey => {
      if (checkedTreeKeys.has(nTreeKey)) {
        return;
      }

      // 当前treeKey切割
      const treeKeySplit = nTreeKey.split('-');
      const treeKeySplitLen = treeKeySplit.length;

      // 当前key值添加至checkedTreeKey
      checkedTreeKeys.add(nTreeKey);
      halfCheckedTreeKeys.delete(nTreeKey);

      // 下级添加进checkedTreeKey
      (this.__treeKeySubs[nTreeKey] || []).forEach(i => {
        halfCheckedTreeKeys.delete(i);
        checkedTreeKeys.add(i);
      });

      // 父级元素添加到halfCheck或check
      // 注：不let i = 0; 因为__treeKeyItemMap内无'root'
      // 从最近父节点开始处理，逐渐往上
      for (let i = treeKeySplitLen - 2; i >= 1; i --) {
        const pKey = treeKeySplit.slice(0, i + 1).join('-');
        const pRow = this.__treeKeyItemMap[pKey];

        // 该父级下已选中节点个数和该父级的子节点个数一致
        if (Array.from(checkedTreeKeys).filter(i => i.includes(`${pKey}-`)).length === pRow.childRowCount) {
          halfCheckedTreeKeys.delete(pKey);
          checkedTreeKeys.add(pKey);
        } else {
          checkedTreeKeys.delete(pKey);
          halfCheckedTreeKeys.add(pKey);
        }
      }
    });

    return {
      checkedTreeKeys: Array.from(checkedTreeKeys),
      halfCheckedTreeKeys: Array.from(halfCheckedTreeKeys),
    }
  }

  /**
   * rowKey转化为树形展开key
   * @param expandedKeys 展开rowKey列表
   */
  convertExpandedRowKeysToTreeKeys = (expandedKeys) => {
    const treeKeys = new Set();
    treeKeys.add('root');

    expandedKeys.forEach(item => {
      const nData = this.__rowKeyItemMap[item];
      if (!nData) {
        return;
      }
      treeKeys.add(nData.treeKey);

      const keySplits = nData.treeKey.split('-');
      const keySplitLen = keySplits.length;
      for (let i = keySplitLen - 1; i >= 1; i--) {
        const tmpPkey = keySplits.slice(0, i).join('-');
        if (treeKeys.has(tmpPkey)) {
          break;
        }
        treeKeys.add(tmpPkey);
      }
    });

    return Array.from(treeKeys);
  }

  /** -------------------star 外部使用函数END star--------------------- */

  /** -------------------star 内部使用函数 star--------------------- */

  // 清除父级未展开的子级keys， TODO: 优化计算
  __filterExpandedKeys = (keys) => {
    const retValue = [];
    keys.forEach(key => {
      if (key === 'root') {
        retValue.push('root');
        return;
      }

      // root-1  root-1-2  等这样匹配是否已展开
      const splitPkeys = key.split('-');
      const len = splitPkeys.length;
      for (let i = len - 2; i >= 0; i --) {
        const temp = splitPkeys.slice(0, i + 1).join('-');
        if (!keys.includes(temp)) {
          return;
        }
      }
      retValue.push(key);
    })
    return retValue;
  }

  /** -------------------star 内部使用函数END star--------------------- */
}
