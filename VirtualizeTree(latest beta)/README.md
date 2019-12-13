# 可视区域  树形展示组件
## 基于React、less编写的可视区域加载组件
## 使用了 Ant Design的 Icon、message、Input 组件，可自行替换

### 使用示例

```code
{treeData && (
  <VirtualizedTree
    data={treeData}
    dataSetting={this.treeDataSetting}
    viewSetting={this.treeViewSetting}
    checkable={true}
    hasSearch={true}
    treeNodeViewRender={this.treeNodeViewRender}
    checkedKeys={checkedKeys}
    defaultExpandedKeys={[1]}
    onCheck={(g) => { this.setState({ checkedKeys: g.checkedKeys }) }}
  />
)}
```

### 参数说明
```code
interface TreeNode {
  [key: string]: string
}

export interface TreeNodeViewData {
  // 禁用复选框
  disableCheckbox?: boolean;
  // 禁用响应
  disabled?: boolean;
  // 展示内容
  content?: ReactNode | string;
  // 展示图标
  icon?: ReactNode;
}

export interface VirtualizedTree {
  // 树主节点
  data: TreeNode;
  // 树形数据设置
  dataSetting: {
    // 数据主键  eg: {id: '1'}, {id: '2'}, 则 dataKey: 'id'
    dataKey: string;
    // 数据展示文本键值  eg: { id: '1', name: 'www' }, 则dataKey: 'name'
    dataViewKey: string;
    // 数据是否存在子节点, 该规则使用方可自己定义，  否则默认使用  nodeData[childArrayKey] 做判断
    hasChild?: (treeNode: TreeNode) => boolean,
    // 子节点键值  eg: { id: '1', child: [{id: '2'}]}, 则 childArrayKey: 'child'
    childArrayKey: string;
    // 异步加载数据函数，当且仅当为异步函数时图标才会有loading效果
    loadData?: (data: TreeNode) => Promise<[]>;
    // 是否异步加载子节点, 该规则使用方可自己定义，  否则默认  false
    needLoadData?: (treeNode: TreeNode) => boolean;
  };
  // 视图设置   tree单行取32.5px的高度
  viewSetting: {
    // 视高（资源树部分视图高度， px）
    clientHeight: number;
    // 视宽（资源树部分视图宽度， px）
    clientWidth: number;
  };
  // 节点前添加Checkbox复选框 default: false
  checkable?: boolean;
  // 默认勾选的树节点 default: [],  必须保证constructor能获取到data
  defaultCheckedKeys?: number[] | string[];
  // 默认展开的树节点 default: [], 必须保证constructor能获取到data
  defaultExpandedKeys?: number[] | string[];
  // （受控）设置选中的树节点  数据请与dataKey保持一致
  checkedKeys?: number[] | string[];
  //  (受控)点击复选框触发
  onCheck?: (data: { checkedKeys: number[] | string[], halfCheckedKeys: number[] | string[], checkedRows: TreeNode[], halfCheckedRows: TreeNode[]}) => any;
  // 是否添加搜索框【前端搜索】
  hasSearch?: boolean;
  // 搜索完成的回调
  onSearch?: (searchStr: string) => any;
  // 节点自定义渲染
  treeNodeViewRender?: (nodeData: TreeNode) => TreeNodeViewData;
  // 加载数据回调,仅提示何数据已加载
  onLoadData?: (dataKey: string) => any;
  // （受控）已加载的节点，需配合dataSetting.loadData使用,可以此控制节点多次加载子节点（子节点内容累加） 
  loadedKeys?: number[] | string[];
  // 内容区域点击回调函数
  onSelect?: (nodeData: TreeNode) => any;
}
```

计算函数在utils里，欢迎优化、更新
