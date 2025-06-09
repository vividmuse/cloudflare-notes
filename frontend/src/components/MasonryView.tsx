import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Memo } from '../api';

interface MasonryViewProps {
  memoList: Memo[];
  renderer: (memo: Memo) => React.ReactNode;
  prefixElement?: React.ReactNode;
  listMode?: boolean;
  className?: string;
}

interface MemoItemProps {
  memo: Memo;
  renderer: (memo: Memo) => React.ReactNode;
  onHeightChange: (memoName: string, height: number) => void;
}

const MemoItem: React.FC<MemoItemProps> = ({ memo, renderer, onHeightChange }) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const measureHeight = useCallback(() => {
    if (itemRef.current) {
      const height = itemRef.current.offsetHeight;
      onHeightChange(memo.name, height);
    }
  }, [memo.name, onHeightChange]);

  useEffect(() => {
    measureHeight();
    
    // 使用 ResizeObserver 监听高度变化
    const resizeObserver = new ResizeObserver(() => {
      measureHeight();
    });

    if (itemRef.current) {
      resizeObserver.observe(itemRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [measureHeight]);

  // 在内容变化时重新测量
  useEffect(() => {
    const timer = setTimeout(() => {
      measureHeight();
    }, 100);
    return () => clearTimeout(timer);
  }, [memo.content, measureHeight]);

  return (
    <div ref={itemRef} className="mb-4 break-inside-avoid">
      {renderer(memo)}
    </div>
  );
};

export const MasonryView: React.FC<MasonryViewProps> = ({
  memoList,
  renderer,
  prefixElement,
  listMode = false,
  className = ''
}) => {
  const [columns, setColumns] = useState(2);
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());
  const [distribution, setDistribution] = useState<{[key: number]: Memo[]}>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 根据屏幕宽度计算列数
  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.offsetWidth;
    let newColumns = 1;
    
    if (width >= 1200) {
      newColumns = 3;
    } else if (width >= 768) {
      newColumns = 2;
    } else {
      newColumns = 1;
    }
    
    setColumns(newColumns);
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    calculateColumns();
    
    const handleResize = () => {
      calculateColumns();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateColumns]);

  // 处理高度变化
  const handleHeightChange = useCallback((memoName: string, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(memoName, height);
      return newMap;
    });
  }, []);

  // 分布算法：找到最短的列
  const findShortestColumnIndex = useCallback((heights: number[]): number => {
    return heights.reduce((minIndex, currentHeight, currentIndex) => 
      currentHeight < heights[minIndex] ? currentIndex : minIndex, 0
    );
  }, []);

  // 重新分布 memos 到各列
  useEffect(() => {
    if (listMode) {
      // 列表模式，所有 memo 放在一列
      setDistribution({ 0: memoList });
      return;
    }

    const newColumnHeights = new Array(columns).fill(0);
    const newDistribution: {[key: number]: Memo[]} = {};
    
    // 初始化各列
    for (let i = 0; i < columns; i++) {
      newDistribution[i] = [];
    }

    // 按创建时间排序，置顶的放在前面
    const sortedMemos = [...memoList].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    });

    // 分布 memos
    sortedMemos.forEach(memo => {
      const shortestColumnIndex = findShortestColumnIndex(newColumnHeights);
      newDistribution[shortestColumnIndex].push(memo);
      
      // 更新列高度
      const memoHeight = itemHeights.get(memo.name) || 200; // 默认高度
      newColumnHeights[shortestColumnIndex] += memoHeight + 16; // 16px margin
    });

    setDistribution(newDistribution);
  }, [memoList, columns, itemHeights, listMode, findShortestColumnIndex]);

  if (listMode) {
    return (
      <div className={`space-y-4 ${className}`} ref={containerRef}>
        {prefixElement}
        {memoList.map(memo => (
          <MemoItem
            key={memo.name}
            memo={memo}
            renderer={renderer}
            onHeightChange={handleHeightChange}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={className} ref={containerRef}>
      {prefixElement && (
        <div className="mb-6">
          {prefixElement}
        </div>
      )}
      
      <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {Array.from({ length: columns }, (_, columnIndex) => (
          <div key={columnIndex} className="space-y-4">
            {(distribution[columnIndex] || []).map(memo => (
              <MemoItem
                key={memo.name}
                memo={memo}
                renderer={renderer}
                onHeightChange={handleHeightChange}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 