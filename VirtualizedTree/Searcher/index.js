import React, { PureComponent } from 'react';
import { Input, message, Icon } from 'antd';
import Dictionary from '../utils/Dictionary';

/**
 * 搜索框
 * @param dataList 数据[{}]
 * @param searchAttr 搜索字段
 * @param onSearch 确认搜索
 */
class Searcher extends PureComponent {

  dictionary = new Dictionary();

  componentDidMount() {
    const { dataList, searchAttr } = this.props;
    dataList.forEach(item => {
      this.dictionary.addWord(item[searchAttr], item.treeKey);
    });
  }
  
  onHandleClear = e => {
    if (e.target.value) {
      return;
    }

    const { onSearch } = this.props;
    if (onSearch) {
      onSearch([], '');
    }
  }

  onHandleSearch = val => {
    const { onSearch } = this.props;

    if (!val) {
      message.warning('搜索内容不能为空!');
      return;
    }

    // 获取匹配的treeKey s
    const searchTreeKeys = this.dictionary.getIndex(val);

    // 添加父级treeKey s
    const totalSKeys = new Set([]);
    searchTreeKeys.forEach(item => {
      const splits = item.split('-');
      const len = splits.length;

      for (let i = len - 1; i >= 1; i --) {
        const tmp = splits.slice(0, i).join('-');
        if (totalSKeys.has(tmp)) {
          break;
        }
        totalSKeys.add(tmp);
      }
    })

    if (onSearch) {
      onSearch(Array.from(totalSKeys), val);
    }
  }

  render() {
    return (
      <Input.Search onSearch={this.onHandleSearch} onChange={this.onHandleClear} placeholder="搜索区域" allowClear />
    );
  }
}

export default Searcher;