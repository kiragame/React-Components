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

  // 当前可见的treekey
  vVirtualTreeKeys = [];

  // 虚拟高度(请乘以单行高度再使用)
  virtualHeight = 1;

  // treeKey生成分割字符串
  treeKeySplit = '-';

  /** -------------------star 外部使用属性END star--------------------- */

  /** -------------------star 内部使用属性 star--------------------- */

  // 记录rowKey: {item}
  __rowKeyItemMap = {};

  // 记录treeKey: {item}
  __treeKeyItemMap = {};

  // 记录treeKey: [sonTreeKey] 仅一级子节点
  __treeKeySon = {};

  // 记录treeKey: [subTreeKeys] 含子孙
  __treeKeySubs = {};

  // 记录expandKey对应的虚拟树, eg: rawKeys: "root,root-1,root-1-3,root-2-2,root-3-3", virtualTreeIndexes: [1,2,3]
  __virtualTree = { rawKeys: "", virtualTreeTreeKeys: [] };

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
    this.vVirtualTreeKeys = [];
    this.hasChild = hasChild;
    this.clientHeight = clientHeight;
    this.rowHeight = rowHeight;

    this.__rowKeyItemMap = {};
    this.__treeKeyItemMap = {};
    this.__treeKeySubs = {};
    this.__treeKeySon = {};
  }

  /**
   * 注册，添加 virtualLayer属性
   * @param nodeData 根节点数据
   */
  markData = (nodeData, virtualLayer = 1, root = 'root') => {
    
    // 节点不存在
    if (!nodeData || !nodeData[this.rowKey]) {
      return 0;
    }

    
    const linkDealedData  = { ...nodeData };

    // ⭐为节点添加属性
    linkDealedData.virtualLayer = virtualLayer;
    linkDealedData.key = nodeData[this.rowKey];
    linkDealedData.treeKey = `${root}-${nodeData[this.rowKey]}`;
    linkDealedData.childRowCount = 0;
    // ⭐为节点添加属性  end

    // 存储treeKey展开后可见treeKey
    if (!this.__treeKeySon[root]) {
      this.__treeKeySon[root] = [];
    }
    this.__treeKeySon[root].push(linkDealedData.treeKey);
    // 存储rowKey与单条内容的映射
    this.__rowKeyItemMap[linkDealedData[this.rowKey]] = linkDealedData;
    // 存储treeKey与单条内容的映射
    this.__treeKeyItemMap[linkDealedData.treeKey] = linkDealedData;
    // 存储treeKey与下级treeKey的映射;更新父级childcount
    const pKeySplits = root.split(this.treeKeySplit);
    for (let tI = 0, pkLen = pKeySplits.length; tI < pkLen; tI ++) {
      const pKey = pKeySplits.slice(0, tI + 1).join(this.treeKeySplit);
      if (!this.__treeKeySubs[pKey]) {
        this.__treeKeySubs[pKey] = [];
      }
      this.__treeKeySubs[pKey].push(linkDealedData.treeKey);

      // 更新父节点高度
      if (this.__treeKeyItemMap[pKey]) {
        this.__treeKeyItemMap[pKey].childRowCount ++;
      }
    }

    // 节点不含有子节点
    if (!this.hasChild(linkDealedData)) {
      return 1;
    }

    for (let i = 0, len = linkDealedData[this.childKey].length; i < len; i ++) {
      const element = linkDealedData[this.childKey][i];
      this.markData(element, virtualLayer + 1, linkDealedData.treeKey);
    }

    return 1;
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

    // 记录可见keys
    let visibleTreeKeys = new Set();

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

      // treeKey排序
      console.time('sort');
      dealedExpandedKeys.forEach(i => {
        visibleTreeKeys.add(i);
        this.__treeKeySon[i] && this.__treeKeySon[i].forEach(k => {
          visibleTreeKeys.add(k);
        })
      });
      visibleTreeKeys = Array.from(visibleTreeKeys).sort(this.__treeKeySort);
      console.timeEnd('sort');
      
      // 移除虚拟根节点
      if (visibleTreeKeys.includes('root')) {
        visibleTreeKeys.splice(visibleTreeKeys.indexOf('root'), 1);
      }

      // 记录至 this.__virtualTree
      this.__virtualTree.rawKeys = expandedKeysToStr;
      this.__virtualTree.virtualTreeTreeKeys = visibleTreeKeys;
    } else {
      visibleTreeKeys = this.__virtualTree.virtualTreeTreeKeys;
    }

    // 重置虚拟高度
    this.virtualHeight = visibleTreeKeys.length;
    // 切割可见keys
    visibleTreeKeys = visibleTreeKeys.slice(startIndex, startIndex + chairs, scrollTop);

    this.vVirtualTreeKeys = visibleTreeKeys;
  }

  // 获取可见条目
  getVisibleItems = () => {
    return this.vVirtualTreeKeys.map(i => this.__treeKeyItemMap[i]);
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
    const treeKeySplit = checkOne.split(this.treeKeySplit);
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
      for (let i = treeKeySplitLen - 1; i >= 1; i --) {
        const pKey = treeKeySplit.slice(0, i).join(this.treeKeySplit);
        const pRow = this.__treeKeyItemMap[pKey];
        
        if (!pRow) {
          continue;
        }

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
        const pKey = treeKeySplit.slice(0, i + 1).join(this.treeKeySplit);
        checked.delete(pKey);
        halfChecked.delete(pKey);
      }
      for (let i = 1; i < treeKeySplitLen - 1; i ++) {
        const pKey = treeKeySplit.slice(0, i + 1).join(this.treeKeySplit);
        // 该父级下已选中节点个数不为空，则加入半选列表
        console.time('judge');
        if (Array.from(checked).filter(i => i.includes(`${pKey}${this.treeKeySplit}`)).length !== 0) {
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
   * 获取子孙节点treeKey
   */
  getSubTreeKeys = (pTreeKey) => {
    return this.__treeKeySubs[pTreeKey] || [];
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
      const lastIndexOfSplitChar = tmp.lastIndexOf(this.treeKeySplit);
      const tmpLen = tmp.length;
      checked.add(tmp.substring(lastIndexOfSplitChar + 1, tmpLen));
    }
    for (let i = 0, len = halfCheckedTreeKeys.length; i < len; i ++) {
      const tmp = halfCheckedTreeKeys[i];
      const lastIndexOfSplitChar = tmp.lastIndexOf(this.treeKeySplit);
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

    console.info('convertCheckedRowKeysToTreeKeys,deal count:', checkedKeys.length)
    console.time('convertCheckedRowKeysToTreeKeys');

    const checkedTreeKeys = new Set();
    const halfCheckedTreeKeys = new Set();

    const needCalTreeKeys = new Set();

    checkedKeys.filter(i => !!this.__rowKeyItemMap[i]).map(i => this.__rowKeyItemMap[i].treeKey).forEach(nTreeKey => {
      if (checkedTreeKeys.has(nTreeKey)) {
        return;
      }

      // 当前treeKey切割
      const treeKeySplit = nTreeKey.split(this.treeKeySplit);
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
      // 从最近父节点开始处理，逐渐往上
      for (let i = treeKeySplitLen - 2; i >= 1; i --) {
        const pKey = treeKeySplit.slice(0, i + 1).join('-');
        if (needCalTreeKeys.has(pKey)) {
          break;
        }
        needCalTreeKeys.add(pKey);
      }
    });

    // 父级添加
    // 注：不let i = 0; 因为__treeKeyItemMap内无'root'
    Array.from(needCalTreeKeys).sort((a, b) => b.split(this.treeKeySplit) - a.split(this.treeKeySplit)).forEach(pKey => {
      const pRow = this.__treeKeyItemMap[pKey];
      // 该父级下已选中节点个数和该父级的子节点个数一致
      if (Array.from(checkedTreeKeys).filter(item => item.includes(`${pKey}${this.treeKeySplit}`)).length === pRow.childRowCount) {
        halfCheckedTreeKeys.delete(pKey);
        checkedTreeKeys.add(pKey);
      } else {
        checkedTreeKeys.delete(pKey);
        halfCheckedTreeKeys.add(pKey);
      }
    });

    console.timeEnd('convertCheckedRowKeysToTreeKeys');
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
    console.info('convertExpandedRowKeysToTreeKeys,deal count:', expandedKeys.length)
    console.time('convertExpandedRowKeysToTreeKeys');

    const treeKeys = new Set();
    treeKeys.add('root');

    expandedKeys.forEach(item => {
      const nData = this.__rowKeyItemMap[item];
      if (!nData) {
        return;
      }
      treeKeys.add(nData.treeKey);

      const keySplits = nData.treeKey.split(this.treeKeySplit);
      const keySplitLen = keySplits.length;
      for (let i = keySplitLen - 1; i >= 1; i--) {
        const tmpPkey = keySplits.slice(0, i).join(this.treeKeySplit);
        if (treeKeys.has(tmpPkey)) {
          break;
        }
        treeKeys.add(tmpPkey);
      }
    });
    console.timeEnd('convertExpandedRowKeysToTreeKeys');
    return Array.from(treeKeys);
  }

  /** -------------------star 外部使用函数END star--------------------- */

  /** -------------------star 内部使用函数 star--------------------- */

  // 清除父级未展开的子级keys， TODO: 优化计算
  __filterExpandedKeys = (keys) => {
    console.info('__filterExpandedKeys,deal count:', keys.length)
    console.time('__filterExpandedKeys');
    const retValue = new Set();

    // 记录各层keys
    const layerKeys = {};
    let maxLayer = 1;
    keys.forEach(key => {
      const splitLen = key.split(this.treeKeySplit).length;
      if (!layerKeys[splitLen - 1]) {
        layerKeys[splitLen - 1] = [];
      }
      layerKeys[splitLen - 1].push(key);
      if (maxLayer < splitLen - 1) {
        maxLayer = splitLen - 1;
      }
    });

    for (let i = 0; i <= maxLayer; i ++) {
      const nowLayerData = layerKeys[i];
      if (!nowLayerData || nowLayerData.length === 0) {
        break;
      }

      nowLayerData.forEach(key => {
        if (key === 'root') {
          retValue.add(key);
          return;
        }
  
        const pCompare = key.substring(0, key.lastIndexOf(this.treeKeySplit));
        if (!retValue.has(pCompare)) {
          return;
        }
        retValue.add(key);
      });
    }
    console.timeEnd('__filterExpandedKeys');
    return Array.from(retValue);
  }

  __treeKeySort = (a, b) => {
    const splitA = a.split(this.treeKeySplit);
    const splitB = b.split(this.treeKeySplit);

    const aLen = splitA.length;
    const bLen = splitB.length;

    for (let i = 0; i < aLen, i < bLen; i ++) {
      if (splitA[i] > splitB[i]) {
        return 1;
      }
      if (splitA[i] < splitB[i]) {
        return -1;
      }
    }

    if (aLen > bLen) {
      return 1;
    }

    if (aLen < bLen) {
      return -1;
    }

    return 0;
  }
  /** -------------------star 内部使用函数END star--------------------- */
}
