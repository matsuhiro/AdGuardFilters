#!/usr/bin/env bash
# ============================================================================
# download_all.sh
# HostlistsRegistry の filters.json から downloadUrl を抽出して一括ダウンロード
#   * 取得ファイルは ./downloads/ 以下に保存
#   * 失敗した URL は ./download_failed.log に追記
#   * 必要コマンド: bash, wget, jq, coreutils (gmd5sum または md5)
# ============================================================================

set -euo pipefail

# ─── 1) 取得先ディレクトリを用意 ─────────────────────────────────────────
OUTDIR="./downloads"
mkdir -p "${OUTDIR}"

# ─── 2) filters.json を取得 ───────────────────────────────────────────────
JSON_URL="https://adguardteam.github.io/HostlistsRegistry/assets/filters.json"
JSON_TMP="$(mktemp)"
if ! wget -q -O "${JSON_TMP}" "${JSON_URL}"; then
  echo "ERROR: filters.json の取得に失敗しました: ${JSON_URL}" >&2
  exit 1
fi

# ─── 3) downloadUrl を抽出して配列に格納 ─────────────────────────────────
if command -v jq >/dev/null 2>&1; then
  urls=()
  while IFS= read -r url; do
    urls+=("$url")
  done < <(jq -r '.filters[].downloadUrl' "${JSON_TMP}")
else
  echo "ERROR: jq が見つかりません。インストールしてください。" >&2
  rm -f "${JSON_TMP}"
  exit 1
fi
rm -f "${JSON_TMP}"

# ─── 4) 失敗ログ初期化 ───────────────────────────────────────────────────
FAILED_LOG="./download_failed.log"
: > "${FAILED_LOG}"

# ─── 5) ダウンロード ────────────────────────────────────────────────────
echo "=== ${#urls[@]} files will be downloaded into '${OUTDIR}' ==="
for url in "${urls[@]}"; do
  # 5-1) 一意なファイル名を生成（MD5 ハッシュ）
  if command -v gmd5sum >/dev/null 2>&1; then
    hash=$(printf '%s' "${url}" | gmd5sum | cut -d' ' -f1)
  else
    hash=$(printf '%s' "${url}" | md5 -q)
  fi

  # 5-2) ベースネーム取得＆整形
  name=$(basename "${url}" | tr -d '?=&')
  [[ -z "${name}" || "${name}" == /* ]] && name="index.html"
  filename="${OUTDIR}/${hash}_${name}"

  # 5-3) ダウンロード実行
  echo "→ ${filename}"
  if ! wget -q --show-progress --no-clobber -O "${filename}" "${url}"; then
    echo "FAILED: ${url}" | tee -a "${FAILED_LOG}"
  fi
done

# ─── 6) 完了メッセージ ──────────────────────────────────────────────────
echo "=== DONE ==="
if [[ -s "${FAILED_LOG}" ]]; then
  echo "エラーが発生した URL は ${FAILED_LOG} に記録しました。"
fi
