document.addEventListener('DOMContentLoaded', () => {
    const domainFileElement = document.getElementById('domainFile');
    const checkButtonElement = document.getElementById('checkButton');
    const statusElement = document.getElementById('status');
    const resultsAreaElement = document.getElementById('resultsArea');
    const unblockedDomainsElement = document.getElementById('unblockedDomains');
    const copyButtonElement = document.getElementById('copyButton');

    let domainsToCheck = [];

    domainFileElement.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                domainsToCheck = e.target.result.split(/\r?\n/)
                                     .map(line => line.trim())
                                     .filter(line => line.length > 0 && !line.startsWith("#") && !line.startsWith("!"));
                if (domainsToCheck.length > 0) {
                    statusElement.textContent = `${domainsToCheck.length} 個のドメインを読み込みました。チェックを開始できます。`;
                } else {
                    statusElement.textContent = 'ファイルに有効なドメインが見つかりません。';
                }
                resultsAreaElement.classList.add('hidden');
                unblockedDomainsElement.value = '';
            };
            reader.onerror = () => {
                statusElement.textContent = 'ファイルの読み込みに失敗しました。';
                domainsToCheck = [];
            };
            reader.readAsText(file);
        } else {
            statusElement.textContent = 'ファイルが選択されていません。';
            domainsToCheck = [];
        }
    });

    checkButtonElement.addEventListener('click', async () => {
        if (domainsToCheck.length === 0) {
            statusElement.textContent = 'まずドメインリストのファイルを選択してください。';
            return;
        }

        statusElement.textContent = 'AdGuardページでドメインをチェック中...';
        checkButtonElement.disabled = true;
        domainFileElement.disabled = true;
        resultsAreaElement.classList.add('hidden');
        unblockedDomainsElement.value = '';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                statusElement.textContent = 'アクティブなタブが見つかりません。AdGuardのページを開いてください。';
                checkButtonElement.disabled = false;
                domainFileElement.disabled = false;
                return;
            }

            const expectedUrlPattern = /https:\/\/adguard-dns\.io\/.*?\/dashboard\/settings\/[a-zA-Z0-9_-]+\/userrules/;
            if (!tab.url || !expectedUrlPattern.test(tab.url)) {
                 if(!confirm(`現在のタブ (${tab.url ? tab.url.substring(0,70)+'...' : '不明なURL'}) は期待されるAdGuard DNSユーザー設定ページではない可能性があります。続行しますか？`)){
                    statusElement.textContent = '処理をキャンセルしました。AdGuard DNSユーザー設定ページで実行してください。';
                    checkButtonElement.disabled = false;
                    domainFileElement.disabled = false;
                    return;
                 }
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: performChecksInPage,
                args: [domainsToCheck, {
                    inputSelector: 'input.ZixsuQXZJbcbNAB5pGrm[type="text"]',
                    buttonSelector: 'form.pHXXeK1ebvpFENlxacJk button.BHHS_ZtwlIEvcY4SXWEM',
                    clearInputButtonSelector: 'input.ZixsuQXZJbcbNAB5pGrm[type="text"] ~ svg.YFOtJ7Q4XDdUBrxG9aES.C6IPBjpy6XBOT2Q_PxVA',
                    resultContainerSelector: 'div.Nric9fWIgpVPG57wp_cn',
                    blockedText: "ペアレンタルコントロール（アダルト系サイトをブロックする）",
                    ruleTextSelector: 'span.RjcpuPjutGXsMYQHCmXl',
                    invalidDomainErrorText: "ドメイン名が無効です",
                    invalidDomainErrorSelector: 'div.OT87bMPy2pwKNdqcaq_f'
                }]
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    statusElement.textContent = `エラー: ${chrome.runtime.lastError.message} (拡張機能の権限やページの互換性を確認してください)`;
                    console.error("Injection error:", chrome.runtime.lastError);
                } else if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                    const result = injectionResults[0].result;
                    if (result.error) {
                        statusElement.textContent = `ページ内処理エラー: ${result.error}`;
                        console.error("Page script error:", result.errorDetail);
                    } else if (typeof result.unblockedDomains !== 'undefined') {
                        let messages = [];
                        if (result.unblockedDomains.length > 0) {
                            unblockedDomainsElement.value = result.unblockedDomains.join('\n');
                            messages.push(`${result.unblockedDomains.length} 個のブロックされていないドメイン`);
                            resultsAreaElement.classList.remove('hidden');
                        } else {
                            messages.push('ブロックされていないドメインはありませんでした');
                            unblockedDomainsElement.value = '';
                            resultsAreaElement.classList.add('hidden');
                        }

                        messages.push(`総処理試行: ${result.processedDomains}/${result.totalDomainsInFile}`);
                        if (result.blockedDomainsCount > 0) messages.push(`ペアレンタルブロック: ${result.blockedDomainsCount}`);
                        if (result.skippedAllowlistCount > 0) messages.push(`許可ルールスキップ(@@): ${result.skippedAllowlistCount}`);
                        if (result.skippedInvalidCount > 0) messages.push(`無効ドメインスキップ: ${result.skippedInvalidCount}`);

                        statusElement.textContent = "完了: " + messages.join('、 ');
                        console.log("Full result object from content script:", result);
                    }
                } else {
                    statusElement.textContent = '不明なエラー: スクリプトの実行結果がありません。コンソールを確認してください。';
                    console.error("Unknown injection issue or no result from content script:", injectionResults);
                }
                checkButtonElement.disabled = false;
                domainFileElement.disabled = false;
            });

        } catch (error) {
            statusElement.textContent = `ポップアップ内エラー: ${error.message}`;
            console.error("Popup error:", error);
            checkButtonElement.disabled = false;
            domainFileElement.disabled = false;
        }
    });

    copyButtonElement.addEventListener('click', () => {
        if (unblockedDomainsElement.value) {
            navigator.clipboard.writeText(unblockedDomainsElement.value)
                .then(() => {
                    const originalStatus = statusElement.textContent;
                    statusElement.textContent = 'リストをクリップボードにコピーしました！';
                    setTimeout(() => statusElement.textContent = originalStatus, 2000);
                })
                .catch(err => {
                    statusElement.textContent = 'コピーに失敗しました。コンソールで詳細を確認してください。';
                    console.error('Clipboard copy failed: ', err);
                });
        }
    });

    // この関数は注入され、AdGuardのページコンテキストで実行されます
    async function performChecksInPage(domains, selectors) {
        const {
            inputSelector, buttonSelector, clearInputButtonSelector,
            resultContainerSelector, blockedText, ruleTextSelector,
            invalidDomainErrorText, invalidDomainErrorSelector
        } = selectors;

        const unblockedDomains = [];
        let actualProcessedCount = 0;
        let blockedCount = 0;
        let skippedInvalidCount = 0;
        let skippedAllowlistCount = 0;
        const totalDomainsInFile = domains.length;
        let loopCounter = 0;

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        async function waitForElement(selector, timeout = 5000, visibleCheck = true) {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const element = document.querySelector(selector);
                if (element) {
                    if (!visibleCheck || (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0)) {
                         return element;
                    }
                }
                await delay(100);
            }
            return null;
        }

        const domainInputElement = await waitForElement(inputSelector);
        const checkButtonElement = await waitForElement(buttonSelector);

        if (!domainInputElement) {
            return { error: `ドメイン入力フィールド ('${inputSelector}') が見つかりません。`, errorDetail: { selector: inputSelector } };
        }
        if (!checkButtonElement) {
            return { error: `確認ボタン ('${buttonSelector}') が見つかりません。`, errorDetail: { selector: buttonSelector } };
        }

        for (const domain of domains) {
            loopCounter++;
            if (!domain) {
                console.log(`[${loopCounter}/${totalDomainsInFile}] Skipping empty domain entry.`);
                continue;
            }

            const originalDomainFormat = domain; // ★元の形式を保持

            if (originalDomainFormat.startsWith('@@')) {
                console.log(`[${loopCounter}/${totalDomainsInFile}] Skipping allowlist rule (starts with @@): ${originalDomainFormat}`);
                skippedAllowlistCount++;
                continue;
            }

            actualProcessedCount++;

            // ★ AdGuardフォーム入力用および比較用のクリーンなドメイン名を抽出
            let cleanDomainForCheck = originalDomainFormat;
            if (cleanDomainForCheck.startsWith('||')) {
                cleanDomainForCheck = cleanDomainForCheck.substring(2);
            }
            const caretIndex = cleanDomainForCheck.indexOf('^');
            if (caretIndex !== -1) {
                cleanDomainForCheck = cleanDomainForCheck.substring(0, caretIndex);
            }
            // ドメイン名として不適切な文字が含まれていれば、この時点でエラーになる可能性も考慮
            // (例: cleanDomainForCheckが空になる、など)
            if (!cleanDomainForCheck) {
                console.warn(`[${loopCounter}/${totalDomainsInFile}] Domain "${originalDomainFormat}" resulted in empty clean domain. Skipping.`);
                skippedInvalidCount++; // 無効なドメインとしてスキップ
                continue;
            }


            const clearButton = document.querySelector(clearInputButtonSelector);
            if (clearButton && (clearButton.offsetWidth > 0 || clearButton.offsetHeight > 0)) {
                clearButton.click();
                await delay(150);
            }
            const existingErrorElement = document.querySelector(invalidDomainErrorSelector);
            if(existingErrorElement && existingErrorElement.offsetParent !== null) {
                domainInputElement.value = "_"; // Reset input to potentially clear error state
                domainInputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                await delay(50);
            }

            domainInputElement.value = cleanDomainForCheck; // ★クリーンなドメインを入力
            domainInputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            domainInputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            await delay(300);

            let invalidErrorElement = await waitForElement(invalidDomainErrorSelector, 500, false);
             if (invalidErrorElement && (invalidErrorElement.offsetWidth > 0 || invalidErrorElement.offsetHeight > 0) && invalidErrorElement.innerText.trim() === invalidDomainErrorText) {
                console.warn(`[${loopCounter}/${totalDomainsInFile}] Invalid domain (cleaned: "${cleanDomainForCheck}", original: "${originalDomainFormat}") detected by UI (pre-check). Skipping.`);
                skippedInvalidCount++;
                continue;
            }

            checkButtonElement.click();
            await delay(1800);

            invalidErrorElement = await waitForElement(invalidDomainErrorSelector, 500, false);
            if (invalidErrorElement && (invalidErrorElement.offsetWidth > 0 || invalidErrorElement.offsetHeight > 0) && invalidErrorElement.innerText.trim() === invalidDomainErrorText) {
                console.warn(`[${loopCounter}/${totalDomainsInFile}] Invalid domain (cleaned: "${cleanDomainForCheck}", original: "${originalDomainFormat}") detected by UI (post-check). Skipping.`);
                skippedInvalidCount++;
                continue;
            }

            let isBlockedByParentalControl = false;
            const resultContainer = await waitForElement(resultContainerSelector, 1000);

            if (resultContainer) {
                const resultText = resultContainer.innerText || "";
                if (resultText.includes(blockedText)) {
                    const ruleElement = resultContainer.querySelector(ruleTextSelector);
                    // ★結果のドメインもクリーンなドメインと比較
                    if (ruleElement && ruleElement.innerText.trim().toLowerCase() === cleanDomainForCheck.toLowerCase()) {
                        isBlockedByParentalControl = true;
                    } else if (ruleElement) {
                        console.warn(`[${loopCounter}/${totalDomainsInFile}] Domain (cleaned: "${cleanDomainForCheck}", original: "${originalDomainFormat}"): Parental control text found, but AdGuard rule showed "${ruleElement.innerText.trim()}". Assuming blocked.`);
                        isBlockedByParentalControl = true;
                    } else {
                        console.warn(`[${loopCounter}/${totalDomainsInFile}] Domain (cleaned: "${cleanDomainForCheck}", original: "${originalDomainFormat}"): Parental control text found, but rule element ('${ruleTextSelector}') not found in result. Assuming blocked.`);
                        isBlockedByParentalControl = true;
                    }
                }
            } else {
                console.warn(`[${loopCounter}/${totalDomainsInFile}] Result container ('${resultContainerSelector}') not found or not visible for domain (cleaned: "${cleanDomainForCheck}", original: "${originalDomainFormat}"), and not an "invalid domain" error. Assuming NOT blocked by parental control.`);
            }

            if (isBlockedByParentalControl) {
                blockedCount++;
            } else {
                unblockedDomains.push(originalDomainFormat); // ★元の形式でリストに追加
            }
            console.log(`[${loopCounter}/${totalDomainsInFile}] Checked Original: "${originalDomainFormat}" (as "${cleanDomainForCheck}"), Blocked by Parental: ${isBlockedByParentalControl}`);

            await delay(600);
        }

        return {
            unblockedDomains: unblockedDomains,
            processedDomains: actualProcessedCount,
            totalDomainsInFile: totalDomainsInFile,
            blockedDomainsCount: blockedCount,
            skippedInvalidCount: skippedInvalidCount,
            skippedAllowlistCount: skippedAllowlistCount
        };
    }
});
