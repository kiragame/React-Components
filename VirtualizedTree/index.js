import React, { PureComponent } from 'react';
import { message } from 'antd';
import VirtualTreeNode from './VirtualTreeNode';
import Searcher from './Searcher';
import VirtualizeTree from './utils/VirtualizeTree';

import './index.less';

/**
 * 单行高
 */
const rowHeight = 32.5;

/**
 * 【全量数据】可视区域资源树; 请保证construtor内可读取到data
 * @param data 树形数据主节点
 * @param dataSetting 树形数据设置
 *     {
 *        // 数据主键  eg: {id: '1'}, {id: '2'}, 则 dataKey: 'id'
 *        dataKey: string,
 *        // 数据展示文本键值  eg: { id: '1', name: 'www' }, 则dataKey: 'name'
 *        dataViewKey: string,
 *        // 数据是否存在子节点, 该规则使用方可自己定义，  否则默认使用  nodeData[childArrayKey] 做判断
 *        hasChild?: (treeNode) => boolean
 *        // 子节点键值  eg: { id: '1', child: [{id: '2'}]}, 则 childArrayKey: 'child'
 *        childArrayKey?: string,
 *     }
 * @param viewSetting 视图设置   tree单行取32.5px的高度
 *     {
 *        // 视高（资源树部分视图高度， px）
 *        clientHeight: number,
 *        // 视宽（资源树部分视图宽度， px）
 *        clientWidth: number,
 *     }
 * @param checkable?  节点前添加Checkbox复选框 default: false
 * @param defaultCheckedKeys? 默认勾选的树节点 default: [],  必须保证constructor能获取到data
 * @param defaultExpandedKeys? 默认展开的树节点 default: [], 必须保证constructor能获取到data
 * @param treeNodeViewRender? 节点渲染
 *    （nodeData) => { disableCheckbox: boolean, disabled: boolean, content: ReactNode, icon: ReactNode, title: string }
 * @param checkedKeys? （受控）设置选中的树节点
 * @param onCheck? 点击复选框触发
 *    function({checkedKeys: Array(), halfCheckedKeys: Array(), checkedRows: Array(), halfCheckedRows: Array()}) {}
 * @param hasSearch? 是否添加搜索框【前端搜索】
 * @param onSearch? 搜索回调
 */
class VirtualizedTree extends PureComponent {

  contentElem = null;

  constructor(props) {
    super(props);

    const {
      defaultCheckedKeys,
      defaultExpandedKeys,
      dataSetting: {
        dataKey,
        childArrayKey,
        hasChild
      },
      viewSetting: {
        clientHeight
      },
      data,
    } = props;
    // 初始化虚拟树对象，传入 数据主键、数据子节点键值、数据是否有子节点的判断函数、视图高度、行高
    const virtualTree = new VirtualizeTree();
    virtualTree.initVirtualizeTree(dataKey, childArrayKey, hasChild || (i => !!i[childArrayKey]), clientHeight, rowHeight);

    let dealData = {};
    let check = {};
    let expandedKeys = ['root'];
    if (Object.keys(data) !== 0) {
      dealData = { ...data };
      // 数据标注
      virtualTree.markData(dealData);
      // check回显
      if (defaultCheckedKeys) {
        check = virtualTree.convertCheckedRowKeysToTreeKeys(defaultCheckedKeys || []);
      }
      // expandedKey
      if (defaultExpandedKeys) {
        expandedKeys = virtualTree.convertExpandedRowKeysToTreeKeys(defaultExpandedKeys);
      }
      // 获取可见数据；   POINT: 必须等markData执行后再执行
      virtualTree.getVisibleVirtualIndex(expandedKeys, 0);
    }

    this.state = {
      // 已选中
      checkedKeys: check.checkedTreeKeys,
      // 半勾选项
      halfCheckedKeys: check.halfCheckedTreeKeys,
      scrollTop: 0,
      data: dealData,
      // 虚拟树实例 star star star
      virtualTree,
      // 已展开
      expandedKeys,
      // 受控态props传入的key，以此参数对比判断是否更新state.checkedKeys
      outerCheckedKeys: [],
    };
  }

  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.checkedKeys !== state.outerCheckedKeys) {
      console.time('get derived state from props');
      const getChecked = state.virtualTree.convertCheckedRowKeysToTreeKeys(nextProps.checkedKeys);
      console.timeEnd('get derived state from props');
      return {
        checkedKeys: getChecked.checkedTreeKeys,
        halfCheckedKeys: getChecked.halfCheckedTreeKeys,
        outerCheckedKeys: nextProps.checkedKeys,
      };
    }
    return null;
  }

  /**
   * 资源树内容区滚动
   */
  onContentScroll = () => {
    if (!this.contentElem) {
      console.error('【VirtualizedTree】内容区未成功绑定，滚动事件失效');
      return;
    }

    const { expandedKeys, virtualTree } = this.state;
    const { scrollTop } = this.contentElem;
    
    virtualTree.getVisibleVirtualIndex(expandedKeys, scrollTop);
    this.setState(() => {
      return {
        scrollTop
      };
    });
  }

  /**
   * 树形展开
   */
  onTreeExpand = key => {
    this.setState(pre => {
      const { scrollTop, expandedKeys, virtualTree } = pre;

      let freshExpandKeys = [ ...expandedKeys ];
      if (freshExpandKeys.includes(key)) {
        freshExpandKeys.splice(freshExpandKeys.indexOf(key), 1);
      } else {
        freshExpandKeys.push(key);
      }
      if (!freshExpandKeys.includes('root')) {
        freshExpandKeys.push('root');
      }

      virtualTree.getVisibleVirtualIndex(freshExpandKeys, scrollTop);
      return {
        expandedKeys: freshExpandKeys,
      }
    });
  }

  /**
   * 选中树节点
   */
  onCheck = (treeKey) => {
    const { onCheck } = this.props;
    const { checkedKeys, halfCheckedKeys, virtualTree } = this.state; 
    
    console.time('onCheck');
    const treeKeyDeal = virtualTree.getCheckedTreeKeys(treeKey, checkedKeys, halfCheckedKeys);

    if (onCheck) {
      onCheck(virtualTree.convertCheckedTreeKeysToRowKeys(treeKeyDeal.checkedTreeKeys, treeKeyDeal.halfCheckedTreeKeys));
      console.timeEnd('onCheck');
      return;
    } else {
      this.setState(() => {
        return {
          checkedKeys: treeKeyDeal.checkedTreeKeys,
          halfCheckedKeys: treeKeyDeal.halfCheckedTreeKeys,
        };
      });
    }
    console.timeEnd('onCheck');
  }

  /**
   * 搜索
   */
  onSearch = (matchTreeKeys, searchText) => {
    const nKey = matchTreeKeys || [];

    if (searchText && nKey.length === 0) {
      message.info('无搜索结果');
      return;
    }

    if (nKey.length !== 0) {
      this.setState(pre => {
        pre.virtualTree.getVisibleVirtualIndex(nKey, pre.scrollTop);
        return {
          expandedKeys: nKey,
        };
      });
    }

    const { onSearch } = this.props;
    if (onSearch) {
      onSearch(searchText);
    }
  }

  /**
   * 判断数据和主键
   */
  exceptions = (data, dataKey) => {

    // data不存在
    if (!data) {
      console.warn('【VirtualizedTree】未传递数据');
      return true;
    }

    // 主键不存在
    if (!Object.keys(data).includes(dataKey)) {
      console.warn('【VirtualizedTree】', '数据', data, '不存在属性', dataKey);
      return true;
    }

    return false;
  }

  /**
   * 判断是否存在子节点
   */
  hasChild = (treeNode) => {
    const { dataSetting: { hasChild, childArrayKey } } = this.props;

    return hasChild? hasChild(treeNode): !!treeNode[childArrayKey];
  }

  /**
   * 单条数据绑定
   */
  renderTreeNodeEach = (data) => {
    const { expandedKeys, checkedKeys, halfCheckedKeys } = this.state;
    const { checkable, treeNodeViewRender, dataSetting: { dataViewKey } } = this.props;
    const isChild = this.hasChild(data);
    const isExpanded = expandedKeys.includes(data.treeKey);
    const isChecked = checkedKeys.includes(data.treeKey);
    const isHalfChecked = halfCheckedKeys.includes(data.treeKey);

    let defaultSetting = { disableCheckbox: false, disabled: false, icon: null, title: data[dataViewKey], content: data[dataViewKey] };
    // 用户存在自定义
    if (treeNodeViewRender) {
      defaultSetting = { ...defaultSetting, ...treeNodeViewRender(data) };
    }

    return (
      <VirtualTreeNode
        isChild={isChild}
        isExpanded={isExpanded}
        isChecked={isChecked}
        isHalfChecked={isHalfChecked}
        vTreeNode={data}
        checkable={checkable}
        onExpand={!defaultSetting.disabled && this.onTreeExpand}
        onCheck={!defaultSetting.disableCheckbox && this.onCheck}
        disableCheckbox={defaultSetting.disableCheckbox}
        disabled={defaultSetting.disabled}
      >
        <div title={defaultSetting.title}>
          {defaultSetting.icon && <div className='v-tree-node-icon'>{defaultSetting.icon}</div>}{defaultSetting.content}
        </div>
      </VirtualTreeNode>
    );
  }

  /**
   * 遍历已处理列表数据
   */
  renderTreeNode = (data) => {
    console.log(data);
    if (data.length === 0) {
      return null;
    }

    return data.map(item => this.renderTreeNodeEach(item));
  }

  render() {
    const { dataSetting: { dataViewKey }, viewSetting: { clientHeight, clientWidth }, hasSearch } = this.props;
    const { scrollTop, virtualTree } = this.state;

    const dealedData = virtualTree.getVisibleItems();
    if (dealedData.length === 0) {
      return '无内容';
    }

    return (
      <div>
        <React.Fragment>
          {hasSearch && <Searcher searchAttr={dataViewKey} dataList={virtualTree.getListData()} onSearch={this.onSearch} />}
          <div style={{ width: `${clientWidth}px`, height: `${clientHeight}px`, overflow: 'auto', position: 'relative' }} ref={r => this.contentElem = r} onScroll={this.onContentScroll}>
            <div style={{ height: `${rowHeight * virtualTree.virtualHeight }px` }} />
            <div style={{ position: 'absolute', top: scrollTop }}>
              {(() => { console.time('render'); return null; })()}
              {this.renderTreeNode(dealedData)}
              {(() => { console.timeEnd('render'); return null; })()}
            </div>
          </div>
        </React.Fragment>
      </div>
    );
  }
}

export default VirtualizedTree;