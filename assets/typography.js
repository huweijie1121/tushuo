/* 图说 · 中文排版
 *
 * 这是和国外工具拉开差距的地方：中文断行、避头尾、中英混排、中文字体栈。
 * 浏览器里用 canvas 的真实 measureText 量宽；node 里退化成"每字宽度表"。
 */
(function (全局) {
  'use strict';

  /* ---------- 字体栈：全部用系统字体，保证离线可用、不下载任何东西 ---------- */
  const 字体栈 = {
    黑体: '"Microsoft YaHei","微软雅黑","PingFang SC","Hiragino Sans GB","Source Han Sans SC","Noto Sans CJK SC",sans-serif',
    宋体: '"Source Han Serif SC","Songti SC","STSong","SimSun","宋体",serif',
    楷体: '"Kaiti SC","STKaiti","KaiTi","楷体",serif',
    等宽: '"Cascadia Mono","Consolas","Menlo",monospace'
  };

  /* ---------- 标点：中文避头尾 ---------- */
  const 禁行首 = '，。、；：？！）】》」』”’…·%,;:?!)]}>·※～ー℃°';
  const 禁行尾 = '（【《「『“‘([{<';

  function 是全角(ch) {
    const c = ch.codePointAt(0);
    return (
      (c >= 0x1100 && c <= 0x115f) ||      // 韩文字母
      (c >= 0x2e80 && c <= 0x303e) ||      // 中日韩部首、标点
      (c >= 0x3041 && c <= 0x33ff) ||      // 假名、注音、全角符号
      (c >= 0x3400 && c <= 0x4dbf) ||      // 扩展 A
      (c >= 0x4e00 && c <= 0x9fff) ||      // 常用汉字
      (c >= 0xa000 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||      // 谚文
      (c >= 0xf900 && c <= 0xfaff) ||      // 兼容汉字
      (c >= 0xfe30 && c <= 0xfe4f) ||      // 竖排标点
      (c >= 0xff00 && c <= 0xff60) ||      // 全角 ASCII
      (c >= 0xffe0 && c <= 0xffe6) ||
      (c >= 0x1f300 && c <= 0x1faff)       // emoji
    );
  }

  // node 侧近似量宽表（单位：em）。浏览器侧用不到。
  function 近似宽(ch) {
    if (是全角(ch)) return 1.0;
    const c = ch.codePointAt(0);
    if (ch === ' ') return 0.28;
    if (c >= 0x30 && c <= 0x39) return 0.556;                       // 数字
    if (c >= 0x41 && c <= 0x5a) return 0.68;                        // 大写
    if (c >= 0x61 && c <= 0x7a) return 0.53;                        // 小写
    if (',.;:!|iljft[](){}\'`'.indexOf(ch) >= 0) return 0.3;
    if ('MW@%'.indexOf(ch) >= 0) return 0.85;
    return 0.56;
  }

  /* ---------- 量宽器 ---------- */

  function 建量宽器(字体栈值, 可用画布) {
    let ctx = null;
    try {
      if (可用画布) ctx = 可用画布.getContext('2d');
      else if (typeof document !== 'undefined') ctx = document.createElement('canvas').getContext('2d');
    } catch (e) { ctx = null; }

    const 缓存 = new Map();

    return function 量(text, 字号, 字重) {
      const 串 = String(text == null ? '' : text);
      if (!串) return 0;
      const 键 = 字号 + '|' + (字重 || 400) + '|' + 串;
      if (缓存.has(键)) return 缓存.get(键);
      let 宽 = 0;
      if (ctx) {
        ctx.font = (字重 || 400) + ' ' + 字号 + 'px ' + 字体栈值;
        宽 = ctx.measureText(串).width;
      } else {
        let em = 0;
        for (const ch of 串) em += 近似宽(ch);
        宽 = em * 字号;
      }
      缓存.set(键, 宽);
      return 宽;
    };
  }

  /* ---------- 中英混排：在中英文之间补一点空隙 ---------- */

  // 中英之间、以及中文与数字之间，插入一个半角空格（约 1/4 em），是中文排版的通行做法。
  // 可用开关关掉（有些用户要"原文可复制"）。
  function 混排(文本, 开关) {
    if (!开关) return String(文本 == null ? '' : 文本);
    const 串 = String(文本 == null ? '' : 文本);
    const 汉字 = '[\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3040-\\u30ff\\uac00-\\ud7a3\\uf900-\\ufaff]';
    // 只处理「汉字 ↔ 半角」的交界；全角标点（，。！？）自带留白，不重复加。
    return 串
      .replace(new RegExp('(' + 汉字 + ')([A-Za-z0-9@#$¥￥({\\[])', 'g'), '$1 $2')
      .replace(new RegExp('([A-Za-z0-9%)\\]}@$¥￥])(' + 汉字 + ')', 'g'), '$1 $2');
  }

  /* ---------- 断行 ---------- */

  /*
   * 规则：
   * 1) 中文可在任意字之间断行，英文/数字按整词走（不切断单词）；
   * 2) 避头尾：行首不出现标点，行尾不出现开引号/开括号；
   * 3) 允许标点轻微悬挂（最多溢出 1 个字宽），这比硬挤更好看。
   */
  function 断行(文本, 最大宽, 量宽, 字号, 字重, 语境) {
    const 串 = String(文本 == null ? '' : 文本);
    if (!串) return [];
    const 语 = 语境 || {};
    const 最多行 = 语.最多行 || 99;
    const 省略 = 语.省略 !== false;
    const 行集 = [];
    let 行 = '';
    let 行宽 = 0;
    let i = 0;

    const 收行 = () => { if (行) 行集.push(行); 行 = ''; 行宽 = 0; };

    while (i < 串.length) {
      const ch = 串[i];
      let 片段 = ch;
      let 片段宽 = 量宽(ch, 字号, 字重);

      // 英文 / 数字：按词取（含内部的 . - _ / % 等）
      if (/[A-Za-z0-9@#$%^&*_+=\-/.~]/.test(ch)) {
        let j = i;
        while (j + 1 < 串.length && /[A-Za-z0-9@#$%^&*_+=\-/.~]/.test(串[j + 1])) j += 1;
        片段 = 串.slice(i, j + 1);
        片段宽 = 量宽(片段, 字号, 字重);
      }

      if (行宽 + 片段宽 > 最大宽 && 行) {
        // 避头尾：下一个字是禁行首标点 → 允许它挤在行尾（悬挂）
        const 下一字 = 片段[0];
        const 本行末 = 行[行.length - 1];
        if (禁行首.indexOf(下一字) >= 0 && 行宽 + 片段宽 <= 最大宽 + 字号) {
          行 += 片段; 行宽 += 片段宽; i += 片段.length; 收行(); continue;
        }
        if (禁行尾.indexOf(本行末) >= 0) {
          // 行尾是开引号/开括号 → 把它挪到下一行
          行 = 行.slice(0, -1); 行宽 = 量宽(行, 字号, 字重);
          收行();
          行 = 本行末; 行宽 = 量宽(本行末, 字号, 字重);
          continue;
        }
        收行();
        continue;
      }

      行 += 片段;
      行宽 += 片段宽;
      i += 片段.length;
    }
    收行();

    // 中文排版忌讳"孤字"：最后一行只剩一个字，就把最后两行匀一匀
    if (行集.length >= 2) {
      const 末 = 行集[行集.length - 1];
      const 倒二 = 行集[行集.length - 2];
      if (末.length === 1 && 倒二.length >= 3) {
        const 合 = 倒二 + 末;
        const 半 = Math.ceil(合.length / 2);
        const 新倒二 = 合.slice(0, 半);
        const 新末 = 合.slice(半);
        if (禁行首.indexOf(新末[0]) < 0 && 禁行尾.indexOf(新倒二[新倒二.length - 1]) < 0) {
          行集[行集.length - 2] = 新倒二;
          行集[行集.length - 1] = 新末;
        }
      }
    }

    if (行集.length > 最多行) {
      const 留 = 行集.slice(0, 最多行);
      if (省略) {
        const 末 = 留[最多行 - 1];
        留[最多行 - 1] = 末.slice(0, Math.max(1, 末.length - 1)) + '…';
      }
      return 留;
    }
    return 行集;
  }

  /* ---------- 行高 ---------- */

  // 中文比英文需要更大行高：正文 1.75、标题 1.3。
  function 行高(用途) {
    if (用途 === '标题') return 1.32;
    if (用途 === '紧') return 1.5;
    return 1.72;
  }

  // 根据可用高度，算出一组文字最多能排几行
  function 容得下几行(可用高, 字号, 行高值) {
    return Math.max(1, Math.floor(可用高 / (字号 * 行高值)));
  }

  const 排版 = { 字体栈, 建量宽器, 断行, 混排, 是全角, 行高, 容得下几行, 近似宽 };

  if (typeof module !== 'undefined' && module.exports) module.exports = 排版;
  else 全局.图说排版 = 排版;
})(typeof self !== 'undefined' ? self : globalThis);
