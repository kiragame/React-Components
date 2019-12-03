import React, { PureComponent } from 'react';
import { Icon, Checkbox } from 'antd';

import "./index.less";

/**
 * @param vTreeNode 经处理的树数据
 * @param isChild 是否存在下级
 * @param isExpanded 是否展开
 * @param isChecked 是否选中
 * @param isHalfChecked 是否为半选复选框
 * @param checkable 是否存在复选框
 * @param onExpand 点击展开按钮
 * @param onCheck 点击勾选框
 * @param disableCheckbox 是否禁用复选框
 * @param disabled 是否禁用
 */
class VirtualTreeNode extends PureComponent {

  onExpand = () => {
    const { vTreeNode, onExpand } = this.props;

    if (onExpand) {
      onExpand(vTreeNode.treeKey);
    }
  }

  onCheck = () => {
    const { vTreeNode, onCheck } = this.props;

    if (onCheck) {
      onCheck(vTreeNode.treeKey);
    }
  }

  render() {
    const { vTreeNode, isChild, isExpanded, isChecked, isHalfChecked, checkable, disableCheckbox, disabled, children } = this.props;

    return (
      <div className='v-tree-node' key={vTreeNode.treeKey} style={{ paddingLeft: (vTreeNode.virtualLayer - 1) * 18, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#ccc' : 'unset' }}>
        {isChild && <Icon style={{ fontSize: 10, cursor: disabled ? 'not-allowed' : 'pointer' }} className='v-tree-icon' onClick={this.onExpand} type={isExpanded ? 'caret-down' : 'caret-right'} />}
        {!isChild && checkable && (<div style={{ width: '24px', height: 'auto', display: 'inline-block' }} />)}
        {checkable && (<Checkbox checked={isChecked} indeterminate={isHalfChecked} onClick={this.onCheck} disabled={disableCheckbox} />)}
        <div className='v-tree-content'>{children}</div>
      </div>
    );
  }
}

export default VirtualTreeNode;