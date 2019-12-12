import React, { PureComponent } from 'react';
import { Input, message } from 'antd';
import Dictionary from '../utils/Dictionary';

/**
 * 搜索框
 * @param dataList 数据[{}]
 * @param searchAttr 搜索字段
 * @param onSearch 确认搜索
 * @param primaryAttr 数据主键
 */
class Searcher extends PureComponent {

  state = { preDataListNum: 0, hasMarkedData: new Set(), dictionary: new Dictionary(), loading: false };

  static getDerivedStateFromProps(nextProps, preState) {

    if (nextProps.dataList && nextProps.dataList.length !== preState.preDataListNum) {
      
      console.time('Searcher');
      new Promise((res) => {
        setTimeout(() => {
          const { dataList, searchAttr, primaryAttr } = nextProps;
          dataList.forEach(item => {
            if (preState.hasMarkedData.has(item[primaryAttr])) {
              return;
            }
            preState.dictionary.addWord(item[searchAttr], item.treeKey);
            preState.hasMarkedData.add(item[primaryAttr]);
            
          });
          res();
        }, 0);
      });
      console.timeEnd('Searcher');

      return {
        preDataListNum: nextProps.dataList.length,
      };
    }
    return null;
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
    const { dictionary } = this.state;

    if (!val) {
      message.warning('搜索内容不能为空!');
      return;
    }

    this.setState(() => {
      return {
        loading: true,
      };
    });

    // 获取匹配的treeKey s
    const searchTreeKeys = dictionary.getIndex(val);

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

    this.setState(() => {
      return {
        loading: false,
      };
    });

    if (onSearch) {
      onSearch(Array.from(totalSKeys), val);
    }
  }

  render() {
    const { loading } = this.state;
    return (
      <Input.Search onSearch={this.onHandleSearch} onChange={this.onHandleClear} placeholder="搜索区域" allowClear disabled={loading} />
    );
  }
}

export default Searcher;