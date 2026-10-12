/* 图说 · 导出
 * 浏览器里把 SVG 光栅化成 PNG（一倍/两倍/三倍），或者直接存 SVG。
 * 全部本地完成，不经过任何服务器。
 */
(function (全局) {
  'use strict';

  function 下载(数据, 文件名, 类型) {
    const 链接 = document.createElement('a');
    const 对象址 = URL.createObjectURL(new Blob([数据], { type: 类型 }));
    链接.href = 对象址;
    链接.download = 文件名;
    document.body.appendChild(链接);
    链接.click();
    链接.remove();
    setTimeout(() => URL.revokeObjectURL(对象址), 4000);
  }

  function 存SVG(svg文本, 文件名) {
    下载(svg文本, (文件名 || '图说') + '.svg', 'image/svg+xml;charset=utf-8');
  }

  function svg转画布(svg文本, 倍数) {
    return new Promise((成功, 失败) => {
      const 尺寸 = svg文本.match(/width="(\d+)"\s+height="(\d+)"/);
      const 宽 = 尺寸 ? Number(尺寸[1]) : 1080;
      const 高 = 尺寸 ? Number(尺寸[2]) : 1440;
      const 址 = URL.createObjectURL(new Blob([svg文本], { type: 'image/svg+xml;charset=utf-8' }));
      const 图 = new Image();
      图.onload = () => {
        const 画布 = document.createElement('canvas');
        画布.width = Math.round(宽 * 倍数);
        画布.height = Math.round(高 * 倍数);
        const 笔 = 画布.getContext('2d');
        笔.scale(倍数, 倍数);
        笔.drawImage(图, 0, 0, 宽, 高);
        URL.revokeObjectURL(址);
        成功(画布);
      };
      图.onerror = () => { URL.revokeObjectURL(址); 失败(new Error('SVG 转图片失败')); };
      图.src = 址;
    });
  }

  async function 存PNG(svg文本, 文件名, 倍数) {
    const 画布 = await svg转画布(svg文本, 倍数 || 2);
    await new Promise((成功) => {
      画布.toBlob((块) => {
        下载(块, (文件名 || '图说') + `@${倍数 || 2}x.png`, 'image/png');
        成功();
      }, 'image/png');
    });
  }

  async function 复制(文本) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(文本);
        return true;
      }
    } catch (e) { /* 落到下面的兜底 */ }
    const 盒 = document.createElement('textarea');
    盒.value = 文本;
    盒.style.position = 'fixed';
    盒.style.opacity = '0';
    document.body.appendChild(盒);
    盒.select();
    let 成 = false;
    try { 成 = document.execCommand('copy'); } catch (e) { 成 = false; }
    盒.remove();
    return 成;
  }

  全局.图说导出 = { 存SVG, 存PNG, 复制, 下载, svg转画布 };
})(typeof self !== 'undefined' ? self : globalThis);
