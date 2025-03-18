// TreeComponent.jsx
import React, { useRef, useEffect } from 'react';
import './TreeComponent.css';

export default function TreeComponent({ data }) {
  if (!data) return null;

  return (
    <div className="tree">
      <ul className="treeul">
        <TreeNode node={data} />
      </ul>
    </div>
  );
}

function TreeNode({ node }) {
  const nodeRef = useRef(null);

  // 在每次 node 改变时，检测是否超出，超出则逐步减小字体
  useEffect(() => {
    if (nodeRef.current) {
      adjustFontSizeToContainer(nodeRef.current);
    }
  }, [node]);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <li>
    {/* 外层盒子 .dv */}
    <div className="dv">
      {/* 内层绝对定位的文字容器 .dv-text */}
      <div className="dv-text">
        {node.name}
      </div>
    </div>

    {hasChildren && (
      <ul>
        {node.children.map((child, idx) => (
          <TreeNode key={idx} node={child} />
        ))}
      </ul>
    )}
  </li>
  );
}

/**
 * 如果文字内容超出盒子的宽/高，则逐步减小字体直到不溢出或到达最小值。
 * 可根据需求自行调整循环逻辑。
 */
function adjustFontSizeToContainer(element) {
  // 先取初始字体（从 CSS 里可以设置一个较大的初始值），
  // 如果想要动态调大也可以从 1px 往上尝试，但会更麻烦且可能有性能问题。
  let fontSize = parseFloat(window.getComputedStyle(element).fontSize);

  // 宽、高
  const { offsetWidth: containerW, offsetHeight: containerH } = element;

  // 如果节点里没有内容，直接返回
  if (!element.textContent.trim()) return;

  // 不断减少 fontSize，直到文字不超出或者到达一个合理的下限
  while ((element.scrollWidth > containerW || element.scrollHeight > containerH) && fontSize > 5) {
    fontSize -= 1.5;
    element.style.fontSize = `${fontSize}px`;
  }
}