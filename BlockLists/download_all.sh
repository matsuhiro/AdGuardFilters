#!/usr/bin/env bash
# ============================================================================
# download_all.sh
# 送信された HTML 内「ソース」リンク 48 本をまとめて wget で取得するスクリプト
#   * URL のハッシュ (MD5) を用いて衝突しないファイル名を生成
#   * 取得ファイルは ./downloads/ 以下に保存
#   * 失敗した URL は ./download_failed.log に追記
#   * 必要コマンド: bash, wget, md5sum (≒ coreutils)
# ============================================================================

set -euo pipefail

# ---------- 1) 取得先ディレクトリを用意 ----------
OUTDIR="./downloads"
mkdir -p "${OUTDIR}"

# ---------- 2) URL 一覧 ----------
urls=(
  "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt"
  "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/adguard_popup_filter.txt"
  "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/AWAvenue-Ads-Rule.txt"
  "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext"
  "https://raw.githubusercontent.com/badmojr/1Hosts/master/Lite/adblock.txt"
  "https://someonewhocares.org/hosts/zero/hosts"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/multi.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/ultimate.txt"
  "https://raw.githubusercontent.com/Cats-Team/AdRules/main/dns.txt"
  "https://anti-ad.net/adguard.txt"
  "https://cdn.jsdelivr.net/gh/hufilter/hufilter@gh-pages/hufilter-dns.txt"
  "https://raw.githubusercontent.com/ABPindo/indonesianadblockrules/master/subscriptions/aghome.txt"
  "https://raw.githubusercontent.com/MasterKia/PersianBlocker/main/PersianBlockerHosts.txt"
  "https://raw.githubusercontent.com/easylist/EasyListHebrew/master/hosts.txt"
  "https://filters.adtidy.org/dns/filter_25.txt"
  "https://raw.githubusercontent.com/yous/YousList/master/hosts.txt"
  "https://raw.githubusercontent.com/EasyList-Lithuania/easylist_lithuania/master/EasyListLithuaniaHosts.txt"
  "https://raw.githubusercontent.com/cchevy/macedonian-pi-hole-blocklist/master/hosts.txt"
  "https://raw.githubusercontent.com/DandelionSprout/adfilt/master/NorwegianExperimentalList%20alternate%20versions/NordicFiltersAdGuardHome.txt"
  "https://hole.cert.pl/domains/v2/domains_adblock.txt"
  "https://filters.adtidy.org/dns/filter_14.txt"
  "https://raw.githubusercontent.com/lassekongo83/Frellwits-filter-lists/master/Frellwits-Swedish-Hosts-File.txt"
  "https://raw.githubusercontent.com/bkrucarci/turk-adlist/master/hosts"
  "https://filters.adtidy.org/dns/filter_40.txt"
  "https://filters.adtidy.org/dns/filter_16.txt"
  "https://filters.adtidy.org/dns/filter_30.txt"
  "https://raw.githubusercontent.com/DandelionSprout/adfilt/master/Alternate%20versions%20Anti-Malware%20List/AntiMalwareAdGuardHome.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/hoster.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/dyndns.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/doh-vpn-proxy-bypass.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/spam-tlds.txt"
  "https://filters.adtidy.org/dns/filter_44.txt"
  "https://raw.githubusercontent.com/DandelionSprout/adfilt/master/AdGuard%20Home%20Compilation%20List/AdGuardHomeCompilationList-Notifications.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/anti.piracy.txt"
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/gambling.txt"
  "https://raw.githubusercontent.com/ShadowWhisperer/BlockLists/master/Lists/Dating"
  "https://filters.adtidy.org/dns/filter_62.txt"
  "https://raw.githubusercontent.com/braveinnovators/ukrainian-security-filter/main/lists/domains.txt"
  "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/hosts.txt"
  "https://phishing.army/download/phishing_army_blocklist_extended.txt"
  "https://raw.githubusercontent.com/durablenapkin/scamblocklist/master/adguard.txt"
  "https://filters.adtidy.org/dns/filter_42.txt"
  "https://filters.adtidy.org/dns/filter_31.txt"
  "https://filters.adtidy.org/dns/filter_9.txt"
  "https://filters.adtidy.org/dns/filter_50.txt"
  "https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-agh.txt"
)

# ---------- 3) 失敗ログ初期化 ----------
FAILED_LOG="./download_failed.log"
: > "${FAILED_LOG}"

# ---------- 4) ダウンロード ----------
echo "=== ${#urls[@]} files will be downloaded into '${OUTDIR}' ==="
for url in "${urls[@]}"; do
  # 4-1) URL から一意なファイル名を生成
  hash=$(printf '%s' "${url}" | md5sum | cut -d' ' -f1)   # 全体を MD5 ハッシュ
  name=$(basename "${url}" | tr -d '?=&')                  # 末尾ファイル名を取得（クエリ除去）
  [[ -z "${name}" || "${name}" == /* ]] && name="index.html"
  filename="${OUTDIR}/${hash}_${name}"

  # 4-2) ダウンロード実行
  echo "→ ${filename}"
  if ! wget -q --show-progress --no-clobber -O "${filename}" "${url}"; then
    echo "FAILED: ${url}" | tee -a "${FAILED_LOG}"
  fi
done

echo "=== DONE ==="
if [[ -s "${FAILED_LOG}" ]]; then
  echo "エラーが発生した URL は ${FAILED_LOG} に記録しました。"
fi
