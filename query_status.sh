#!/usr/bin/env bash
set -euo pipefail

# 入力ファイル（domain リスト）が第一引数
INPUT_FILE="${1:-domains.txt}"
PREFIX="status"

# 古い出力ファイルを削除
rm -f "${PREFIX}"_*.txt

# ▼ 1) ドメイン数をカウント ▼
# 空行・コメント行を除外してカウント
total=$(grep -v -e '^#' -e '^$' "$INPUT_FILE" | wc -l)
echo "→ 全 $total 件のドメインを処理します。"

# カウンタ初期化
count=0

while IFS= read -r line; do
  # 空行・コメント行スキップ
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue

  # カウンタ更新
  ((count++))

  # ── 装飾削除 ──
  domain="${line#\|\|}"
  domain="${domain%\^}"

  # ▼ 2) 進捗を表示 ▼
  printf '[%3d/%3d] %s → ' "$count" "$total" "$domain"

  # ── DoH クエリ ──
  resp=$(curl -s "https://family.adguard-dns.com/resolve?name=${domain}&type=A")

  # ── Status を抽出 ──
  status=$(echo "$resp" | jq -r '.Status')

  # ── ステータス別ファイルに出力 ──
  echo "$domain" >> "${PREFIX}_${status}.txt"

  # ▼ 3) 結果を表示 ▼
  echo "Status=${status}"
done < "$INPUT_FILE"

echo "→ 完了！各ステータスごとのファイルは ${PREFIX}_0.txt, ${PREFIX}_2.txt … に出力されています。"