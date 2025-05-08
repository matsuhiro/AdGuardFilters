chrome.runtime.onInstalled.addListener(() => {
    chrome.action.disable(); // デフォルトでアクションを無効化
  
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      const adguardDnsUserRulesPage = {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              urlMatches: 'https://adguard-dns.io/(.*?)/dashboard/settings/([a-zA-Z0-9_-]+)/userrules(/?$|\\?.*)'
            },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
      };
  
      chrome.declarativeContent.onPageChanged.addRules([adguardDnsUserRulesPage], () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to add declarativeContent rules:', chrome.runtime.lastError.message);
        } else {
          console.log('DeclarativeContent rules for AdGuard DNS user rules page added.');
        }
      });
    });
  });
  