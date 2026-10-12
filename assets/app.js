/* 图说 · 界面
 * 三条主线：贴文字 → 判图型（规则或 AI）→ 出图导出。
 * 没有框架、没有构建步骤，双击 index.html 就能用。
 */
(function () {
  'use strict';

  const 引擎 = window.图说引擎;
  const 渲染 = window.图说渲染;
  const 导出 = window.图说导出;
  const $ = (选择器) => document.querySelector(选择器);

  /* ---------- 内置示例（也是演示素材） ---------- */

  const 示例 = {
    要点: {
      名: '要点卡',
      文字: `一个人做内容的三条铁律
先定人群，再定选题：你写给谁看，决定了写什么、在哪写、几点发
一条视频只讲一件事：贪多会让人记不住，一句能背下来的话才有人转
发布比完美重要：先发出去拿到反馈，再谈打磨，没人看的完美没有意义`
    },
    步骤: {
      名: '步骤流程',
      文字: `上门维修的接单流程
接到电话先问清楚：问型号、问现象、问楼层，能省一趟空跑
微信发报价单：价格先说清，避免到了现场再砍价
上门先拍照留档：开工前一张、完工后一张，扯皮时能自证
当天收款当天记账：记账拖到晚上就记不全了`
    },
    时间线: {
      名: '时间线',
      文字: `从打工到个体户的 90 天
第 1 周 跑 20 家建材五金店，把人和店面先认一遍
第 2 周 进 5 个业主群，群里有活先接，哪怕不赚钱
第 1 个月 抖音同城日更，拍维修纪实，攒 20 张作品照
第 90 天 复盘要不要注册个体户，看回款稳不稳`
    },
    对比: {
      名: '左右对比',
      文字: `自己拍 vs 找人拍
自己拍：省钱，一次投入长期复用
自己拍：上手快，一小时能出一条
自己拍：光线和收音是硬伤
找人拍：成片专业，构图调色都到位
找人拍：一次 800 元起，按月拍压力不小
找人拍：得先把想法沟通清楚`
    },
    数据: {
      名: '数据卡',
      文字: `第一个月的小红书数据
新增粉丝 1200，主要来自两条实拍视频
成交 38 单，全部来自同城私信
复购率 42%，老客户介绍占了三分之一
单均获客成本 26 元，基本上是零投放`
    },
    层级: {
      名: '层级金字塔',
      文字: `做生意要垫的三层地基
底层：现金流——先活下来，再谈规模和口碑
中层：团队——一个人干不完的时候，谁替你干
顶层：品牌——别人为什么找你而不是找他`
    },
    导图: {
      名: '思维导图',
      文字: `一个人做内容的四个板块
选题：热点、痛点、干货
拍摄：手机、支架、自然光
剪辑：剪映、字幕
发布：小红书、抖音`
    }
  };

  const 默认落款 = '图说 · 免费开源';

  const 状态 = {
    类型: '自动',
    数据: null,
    设置: {
      比例: '小红书 3:4',
      主题: '宣纸',
      字号缩放: 1,
      混排: true,
      显示标题: true,
      显示编号: true,
      显示落款: true,
      落款: 默认落款
    },
    AI: { 地址: 'https://api.deepseek.com/v1', 模型: 'deepseek-chat', Key: '' }
  };

  try {
    const 存 = JSON.parse(localStorage.getItem('图说设置') || 'null');
    if (存) {
      if (存.设置) Object.assign(状态.设置, 存.设置);
      if (存.AI) Object.assign(状态.AI, 存.AI);
    }
  } catch (e) { /* 读不出来就用默认值 */ }

  function 存设置() {
    try { localStorage.setItem('图说设置', JSON.stringify({ 设置: 状态.设置, AI: 状态.AI })); } catch (e) { /* 隐私模式下忽略 */ }
  }

  /* ---------- 控件生成 ---------- */

  const 类型清单 = ['自动', '要点', '步骤', '时间线', '对比', '数据', '层级', '导图'];

  function 造选择条(容器, 清单, 当前, 点击) {
    容器.innerHTML = '';
    清单.forEach((项) => {
      const 钮 = document.createElement('button');
      钮.className = '小钮' + (项 === 当前 ? ' 选中' : '');
      钮.textContent = 项;
      钮.onclick = () => 点击(项);
      容器.appendChild(钮);
    });
  }

  function 刷新控件() {
    造选择条($('#类型条'), 类型清单, 状态.类型, (项) => {
      状态.类型 = 项;
      重排();
    });
    const 主题条 = $('#主题条');
    主题条.innerHTML = '';
    Object.keys(window.图说主题).forEach((名) => {
      const 主题 = window.图说主题[名];
      const 钮 = document.createElement('button');
      钮.className = '色块' + (名 === 状态.设置.主题 ? ' 选中' : '');
      钮.title = 名;
      钮.style.background = 主题.底;
      钮.innerHTML = `<span style="background:${主题.主}"></span><span style="background:${主题.辅}"></span><span style="background:${主题.墨}"></span>`;
      钮.onclick = () => { 状态.设置.主题 = 名; 重排(); };
      主题条.appendChild(钮);
    });
    const 比例选 = $('#比例');
    if (!比例选.options.length) {
      Object.keys(渲染.比例表).forEach((名) => {
        const 选 = document.createElement('option');
        选.value = 名;
        选.textContent = 名 + '（' + 渲染.比例表[名].join('×') + '）';
        比例选.appendChild(选);
      });
    }
    比例选.value = 状态.设置.比例;
  }

  function 刷新表单() {
    $('#字号').value = Math.round(状态.设置.字号缩放 * 100);
    $('#字号值').textContent = Math.round(状态.设置.字号缩放 * 100) + '%';
    $('#混排').checked = 状态.设置.混排;
    $('#显示标题').checked = 状态.设置.显示标题;
    $('#显示编号').checked = 状态.设置.显示编号;
    $('#显示落款').checked = 状态.设置.显示落款;
    $('#落款').value = 状态.设置.落款;
    $('#落款').disabled = !状态.设置.显示落款;
    $('#ai地址').value = 状态.AI.地址;
    $('#ai模型').value = 状态.AI.模型;
    $('#aiKey').value = 状态.AI.Key;
  }

  /* ---------- 主流程 ---------- */

  function 取文字() { return $('#文字').value; }

  function 重排(保留数据) {
    const 文字 = 取文字();
    if (!文字.trim()) {
      $('#画布').innerHTML = '<div class="空状态">把一段中文贴到左边，这里立刻出图。<br>不用登录，不用联网，文字只留在你自己的浏览器里。</div>';
      $('#依据').textContent = '';
      $('#提示').textContent = '';
      状态.数据 = null;
      刷新控件();
      刷新表单();
      return;
    }
    if (!保留数据 || !状态.数据) {
      状态.数据 = 引擎.结构化(文字, 状态.类型);
    }
    画一画();
  }

  function 当前数据() { return 状态.数据; }

  function 画一画() {
    const 数据 = 状态.数据;
    if (!数据) return;
    const 出 = 渲染.渲染(数据, 状态.设置);
    $('#画布').innerHTML = 出.svg;
    $('#尺寸').textContent = 出.宽 + ' × ' + 出.高;
    const 判 = 数据.判据 || {};
    const 盒子 = $('#依据');
    if (状态.类型 !== '自动' || !判.依据 || !判.依据.length) {
      盒子.innerHTML = '';
    } else {
      盒子.innerHTML = `判成「${渲染.类型名[判.类型] || 判.类型}」，依据：` +
        判.依据.map((t) => `<span class="点子">${转义小(t)}</span>`).join('') +
        '<button class="链接钮" id="换型">换成别的图型 ▾</button>';
      $('#换型').onclick = () => $('#类型区').scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    $('#提示').textContent = 出.提示 || '';
    $('#数据框').value = JSON.stringify(数据, null, 2);
    $('#导出条').classList.remove('禁用');
  }

  function 转义小(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function 文件名() {
    const 标题 = (状态.数据 && 状态.数据.标题) || '图说';
    const 净 = 标题.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 24);
    const 时 = new Date();
    const 戳 = String(时.getMonth() + 1).padStart(2, '0') + String(时.getDate()).padStart(2, '0') + '-' +
      String(时.getHours()).padStart(2, '0') + String(时.getMinutes()).padStart(2, '0');
    return `图说-${净}-${戳}`;
  }

  /* ---------- AI 通道（可选） ---------- */

  const 提示词 = `你是中文信息图编辑。把用户给的文字整理成一张信息图的数据，只输出 JSON，不要任何解释。

字段规则：
- 标题：≤ 16 字，别加书名号
- 副标题：可空字符串
- 类型：必须是「要点」「步骤」「时间线」「对比」「数据」「层级」「导图」之一
- 要点 / 步骤 / 层级：条目 = [{标签: ≤12 字, 说明: ≤40 字}]，步骤最多 7 条，要点最多 8 条
- 时间线：条目 = [{时间: 如「第 1 周」「2026年3月」, 标签: ≤12 字, 说明: ≤40 字}]
- 对比：对比 = {左:{标题,条目:[{主,次}]}, 右:{标题,条目:[{主,次}]}}，每侧最多 5 条
- 数据：条目 = [{数值: 只放数字, 单位: 如「%」「元」「单」, 标签: ≤10 字, 备注: ≤24 字}]，最多 6 条
- 导图：导图 = {中心: ≤10 字, 分支: [{标签: ≤10 字, 子: [≤8 字]}]}，分支 3~6 个，每个分支子项 2~3 个

用不到的分支字段留空数组或空对象。数字、单位、百分比一律保留原值，不要四舍五入、不要编造。`;

  async function AI结构化() {
    const 文字 = 取文字();
    if (!文字.trim()) return 提示条('先贴一段文字。');
    if (!状态.AI.Key) { $('#ai区').open = true; return 提示条('要先填一个 API Key（国内任意 OpenAI 兼容接口都行）。'); }
    提示条('正在让模型整理…');
    try {
      const 响应 = await fetch(状态.AI.地址.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + 状态.AI.Key },
        body: JSON.stringify({
          model: 状态.AI.模型,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 提示词 },
            { role: 'user', content: 文字 }
          ]
        })
      });
      if (!响应.ok) throw new Error('接口返回 ' + 响应.status + '：' + (await 响应.text()).slice(0, 200));
      const 结果 = await 响应.json();
      const 内容 = 结果.choices && 结果.choices[0] && 结果.choices[0].message && 结果.choices[0].message.content;
      const JSON文 = String(内容).replace(/^```(?:json)?/m, '').replace(/```\s*$/, '').trim();
      const 数据 = JSON.parse(JSON文);
      if (!数据.类型) throw new Error('模型没给出「类型」字段');
      数据.判据 = { 依据: ['由 AI 按提示词整理（提示词可在折叠面板里查看）'], 类型: 数据.类型 };
      if (!数据.标题) 数据.标题 = 引擎.取标题(文字, 引擎.切条目(文字)).标题;
      状态.数据 = 数据;
      状态.类型 = '自动';
      刷新控件(); 刷新表单(); 画一画();
      提示条('AI 整理完成，可以自己改数据框里的 JSON 再点「应用数据」。');
    } catch (错) {
      提示条('AI 调用失败：' + 错.message + '（规则结果还在，没被覆盖）');
    }
  }

  function 提示条(文) {
    const 盒 = $('#AI提示');
    盒.textContent = 文;
    盒.hidden = false;
  }

  /* ---------- 绑定 ---------- */

  function 绑定() {
    $('#文字').addEventListener('input', () => 重排());

    $('#示例').addEventListener('change', (e) => {
      const 键 = e.target.value;
      if (!键) return;
      $('#文字').value = 示例[键].文字;
      状态.类型 = 键;
      状态.数据 = null;
      重排();
      e.target.selectedIndex = 0;
    });

    $('#比例').addEventListener('change', (e) => { 状态.设置.比例 = e.target.value; 存设置(); 画一画(); });
    $('#字号').addEventListener('input', (e) => {
      状态.设置.字号缩放 = Number(e.target.value) / 100;
      $('#字号值').textContent = e.target.value + '%';
      存设置(); 画一画();
    });
    ['混排', '显示标题', '显示编号', '显示落款'].forEach((名) => {
      $('#' + 名).addEventListener('change', (e) => {
        const 键 = 名 === '显示编号' ? '显示编号' : 名;
        状态.设置[键] = e.target.checked;
        if (名 === '显示落款') $('#落款').disabled = !e.target.checked;
        存设置(); 画一画();
      });
    });
    $('#落款').addEventListener('input', (e) => { 状态.设置.落款 = e.target.value; 存设置(); 画一画(); });

    $('#存PNG2').addEventListener('click', () => 导出.存PNG($('#画布').innerHTML, 文件名(), 2));
    $('#存PNG3').addEventListener('click', () => 导出.存PNG($('#画布').innerHTML, 文件名(), 3));
    $('#存SVG').addEventListener('click', () => 导出.存SVG($('#画布').innerHTML, 文件名()));
    $('#复制SVG').addEventListener('click', async () => {
      const 成 = await 导出.复制($('#画布').innerHTML);
      提示条(成 ? 'SVG 源码已复制，可以贴到 Figma / Illustrator / PPT。' : '复制失败，浏览器拦了剪贴板，请手动从数据框复制。');
    });
    $('#打印').addEventListener('click', () => window.print());

    $('#应用数据').addEventListener('click', () => {
      try {
        const 数据 = JSON.parse($('#数据框').value);
        数据.判据 = { 依据: ['手动改过数据框'], 类型: 数据.类型 };
        状态.数据 = 数据;
        画一画();
        提示条('已应用你改过的数据。');
      } catch (错) {
        提示条('JSON 格式不对：' + 错.message);
      }
    });

    $('#ai结构化').addEventListener('click', AI结构化);
    ['ai地址', 'ai模型', 'aiKey'].forEach((名) => {
      $('#' + 名).addEventListener('change', (e) => {
        const 键 = 名 === 'ai地址' ? '地址' : (名 === 'ai模型' ? '模型' : 'Key');
        状态.AI[键] = e.target.value.trim();
        存设置();
      });
    });
  }

  /* ---------- 启动：支持 #示例=数据&主题=夜幕&比例=横屏 16:9&纯净=1 ---------- */

  // 地址栏里用英文别名，省得复制链接时被百分号编码搅乱
  const 别名 = {
    示例: { yaodian: '要点', buzhou: '步骤', shijianxian: '时间线', duibi: '对比', shuju: '数据', cengji: '层级', daotu: '导图' },
    主题: { xuanzhi: '宣纸', qingci: '青瓷', dianlan: '靛蓝', zhusha: '朱砂', yemu: '夜幕', moyu: '墨玉' },
    比例: { a34: '小红书 3:4', a11: '方图 1:1', a916: '竖屏 9:16', a169: '横屏 16:9', a235: '公众号头图 2.35:1', ppt43: 'PPT 4:3' }
  };

  function 翻别名(类别, 值) {
    return (别名[类别] && 别名[类别][值]) || 值;
  }

  function 读地址栏() {
    const 原始 = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!原始) return false;
    const 参数 = {};
    原始.split('&').forEach((段) => {
      const [k, v] = 段.split('=');
      if (k) 参数[k.trim()] = (v || '').trim();
    });
    let 动了 = false;
    const 示例键 = 翻别名('示例', 参数.示例);
    if (示例键 && 示例[示例键]) {
      $('#文字').value = 示例[示例键].文字;
      状态.类型 = 示例键;
      动了 = true;
    }
    const 主题键 = 翻别名('主题', 参数.主题);
    if (主题键 && window.图说主题[主题键]) { 状态.设置.主题 = 主题键; 动了 = true; }
    const 比例键 = 翻别名('比例', 参数.比例);
    if (比例键 && 渲染.比例表[比例键]) { 状态.设置.比例 = 比例键; 动了 = true; }
    if (参数.落款) { 状态.设置.落款 = 参数.落款; 动了 = true; }
    if (参数.纯净 === '1' || 参数.bare === '1') {
      document.body.classList.add('纯净');
      动了 = true;
    }
    return 动了;
  }

  function 启动() {
    const 选 = $('#示例');
    Object.keys(示例).forEach((键) => {
      const 项 = document.createElement('option');
      项.value = 键;
      项.textContent = 示例[键].名;
      选.appendChild(项);
    });
    绑定();
    读地址栏();
    刷新控件();
    刷新表单();
    重排();
    if (!取文字().trim()) {
      $('#文字').value = 示例.要点.文字;
      状态.类型 = '自动';
      重排();
    }
  }

  window.addEventListener('DOMContentLoaded', 启动);
})();
