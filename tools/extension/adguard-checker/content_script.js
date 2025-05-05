(async function(){
  // --- 1) UI 挿入 ---
  const panel = document.createElement('div');
  panel.id = 'domain-check-panel';
  Object.assign(panel.style, {
    position: 'fixed', top: '10px', right: '10px',
    width: '380px', background: '#fff',
    border: '1px solid #ccc', padding: '8px',
    zIndex: 9999, fontSize: '14px', lineHeight: '1.4'
  });
  panel.innerHTML = `
    <div>
      <input type="file" id="domain-file-input" accept=".txt">
      <button id="start-check-btn">チェック開始</button>
    </div>
    <div style="margin-top:8px;">
      <textarea id="not-blocked-list" rows="8"
        style="width:100%;font-size:13px;"
        placeholder="ブロックされていないドメイン…"></textarea>
    </div>
    <div style="text-align:right;margin-top:4px;">
      <button id="copy-btn">クリップボードにコピー</button>
    </div>
  `;
  document.body.append(panel);

  // --- 2) UI 要素取得 ---
  const fileInput = panel.querySelector('#domain-file-input');
  const startBtn  = panel.querySelector('#start-check-btn');
  const outputTA  = panel.querySelector('#not-blocked-list');
  const copyBtn   = panel.querySelector('#copy-btn');

  // --- 3) ドメインチェック本体 ---
  startBtn.addEventListener('click', async ()=>{
    if (!fileInput.files.length) {
      return alert('ドメインリストファイルを選択してください');
    }
    const text = await fileInput.files[0].text();
    // @@ ルールはスキップ
    const lines = text.split(/\r?\n/).map(l=>l.trim())
      .filter(l=>l && !/^!/.test(l) && !/^@@/.test(l) && /\./.test(l));

    const notBlocked = [];
    for (let raw of lines) {
      // AdGuard フォーマットから生ドメインへ正規化
      const domain = raw.replace(/^\|\|?/, '').replace(/\^.*$/, '');
      const form  = document.querySelector('form.pHXXeK1ebvpFENlxacJk');
      const input = form.querySelector('input[type=text]');

      input.value = domain;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.querySelector('button').click();

      // --- 結果監視 (正常 or エラー) ---
      await new Promise(res => {
        const obs = new MutationObserver(() => {
          if (
            document.querySelector('.Nric9fWIgpVPG57wp_cn') ||
            document.querySelector('.OT87bMPy2pwKNdqcaq_f')
          ) {
            obs.disconnect();
            res();
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });

      // エラー要素と正常応答要素の取得
      const errorElem = document.querySelector('.OT87bMPy2pwKNdqcaq_f');
      const respElem  = document.querySelector(
        '.Nric9fWIgpVPG57wp_cn .sWBvK7f_eF6lgj84X8Da > div'
      );
      const respText  = respElem ? respElem.textContent : '';

      // エラー時も notBlocked に追加、それ以外はブロック判定
      if (errorElem) {
        notBlocked.push(raw);
      } else if (!respText.includes('ペアレンタルコントロール')) {
        notBlocked.push(raw);
      }

      // サーバ負荷軽減のため待機
      await new Promise(r=>setTimeout(r, 200));
    }
    outputTA.value = notBlocked.join('\n');
  });

  // --- 4) コピー機能 ---
  copyBtn.addEventListener('click', ()=>{
    navigator.clipboard.writeText(outputTA.value)
      .then(()=> alert('クリップボードにコピーしました'))
      .catch(()=> alert('コピーに失敗しました'));
  });
})();
