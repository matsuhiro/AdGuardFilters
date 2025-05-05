#!/usr/bin/env python3
"""
ターゲットファイル（AdGuard DNS 形式のドメインリスト）を既存 BlockLists と突き合わせ、
重複していないドメインのみを抽出し、最終的な output/all_filters.txt には
  ・有効なドメイン（DNS Status=0）
  ・入力ファイルに含まれていた除外リスト行（@@ で始まる行）
をそのまま残して出力する。

使い方:
    python check_domains.py target1.txt target2.txt ...
"""
import argparse
import glob
import os
import sys
import datetime
import json
import urllib.request

# ---------- 共通ユーティリティ ----------
def read_domains_from_file(path: str) -> set[str]:
    """
    ファイルからドメインを読み込んで集合で返す。
    ・空行、'#' で始まるコメント行は無視
    ・前後の空白を除去
    ・@@ で始まる行は除外リストとして扱わず読み飛ばす
    """
    domains: set[str] = set()
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or line.startswith("@@"):
                    continue
                domains.add(line)
    except (OSError, UnicodeDecodeError) as e:
        print(f"[ERROR] {path}: {e}", file=sys.stderr)
    return domains


def write_domains_to_file(path: str, domains: set[str]) -> None:
    """集合を書き出す（ソート済み）。"""
    try:
        with open(path, "w", encoding="utf-8") as f:
            for d in sorted(domains):
                f.write(d + "\n")
        print(f"[OK] {path} に {len(domains):,} 件を書き出しました。")
    except OSError as e:
        print(f"[ERROR] {path}: {e}", file=sys.stderr)


# ---------- メイン処理 ----------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="AdGuard DNS 用ドメインの重複チェック＆出力ツール"
    )
    parser.add_argument(
        "target_files",
        nargs="+",
        help="チェック対象のファイル（複数指定可）",
    )
    parser.add_argument(
        "-b",
        "--blocklists-dir",
        default="BlockLists/downloads",
        help="既存リストを格納したディレクトリ",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default="output",
        help="出力ディレクトリ",
    )
    args = parser.parse_args()

    # 既存ドメインを収集（装飾付き）
    existing_domains: set[str] = set()
    for path in glob.glob(os.path.join(args.blocklists_dir, "*")):
        if os.path.isfile(path):
            existing_domains |= read_domains_from_file(path)
    print(f"[INFO] BlockLists に含まれるドメイン総数: {len(existing_domains):,}")

    # 出力先を用意
    os.makedirs(args.output_dir, exist_ok=True)

    # 全入力ファイルからの抽出結果
    exclusion_lines: list[str] = []  # @@ で始まる行を保存
    union_new_domains: set[str] = set()  # 全ファイル共通の新規ドメイン

    for target_path in args.target_files:
        print(f"\n=== 処理中: {target_path} ===")
        # ファイルを行単位で読込み
        try:
            raw_lines = open(target_path, encoding="utf-8").read().splitlines()
        except Exception as e:
            print(f"[ERROR] {target_path}: {e}", file=sys.stderr)
            continue

        # 除外リストとドメイン行を振り分け
        decorated_targets: set[str] = set()
        for line in raw_lines:
            l = line.strip()
            if not l or l.startswith('#'):
                continue
            if l.startswith('@@'):
                if l not in exclusion_lines:
                    exclusion_lines.append(l)
            else:
                decorated_targets.add(l)

        print(f"[INFO] 取り込み件数 (除外行除く): {len(decorated_targets):,}")
        # 重複排除
        new_domains = decorated_targets - existing_domains
        print(f"[INFO] 重複なし新規件数: {len(new_domains):,}")

        # 個別出力
        base = os.path.basename(target_path)
        stem, _ = os.path.splitext(base)
        indiv_out = os.path.join(args.output_dir, f"{stem}_filters.txt")
        write_domains_to_file(indiv_out, new_domains)

        union_new_domains |= new_domains

    # DNS 応答で有効なドメイン(Status=0)のみ抽出
    print(f"[INFO] 新規候補ドメイン数: {len(union_new_domains):,} 件。DNSチェックを開始...", file=sys.stderr)
    valid_domains: set[str] = set()
    total = len(union_new_domains)
    for idx, d in enumerate(sorted(union_new_domains), start=1):
        # デコレーションを除去してドメイン名抽出
        domain = d.lstrip('|').rstrip('^')
        print(f"[{idx}/{total}] {domain} → ", end='', file=sys.stderr)
        try:
            url = f"https://family.adguard-dns.com/resolve?name={domain}&type=A"
            data = urllib.request.urlopen(url, timeout=10).read()
            j = json.loads(data)
            status = j.get('Status', -1)
        except Exception as e:
            print(f"ERROR ({e})", file=sys.stderr)
            continue
        if status == 0:
            valid_domains.add(d)
            print("OK", file=sys.stderr)
        else:
            print(f"Status={status}", file=sys.stderr)

    # 結合ファイルを出力（ヘッダー付き）
    combined_out = os.path.join(args.output_dir, "all_filters.txt")
    now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
    header_lines = [
        "! Title: Japan Youth Restricted Filter",
        "! Description: It contains a blacklist of content considered inappropriate for young people in Japan; restricts inappropriate content on LINE and Yahoo searches.",
        "! Homepage: https://github.com/matsuhiro/AdGuardFilters",
        f"! Last modified: {now}"
    ]
    try:
        with open(combined_out, 'w', encoding='utf-8') as f:
            # コメントヘッダー
            for line in header_lines:
                f.write(line + '\n')
            f.write('\n')
            # 除外リスト行をそのまま出力
            for ex in exclusion_lines:
                f.write(ex + '\n')
            f.write('\n')
            # 有効ドメインのみ
            for d in sorted(valid_domains):
                f.write(d + '\n')
        print(f"[OK] {combined_out} に {len(valid_domains):,} 件を書き出しました。")
    except OSError as e:
        print(f"[ERROR] {combined_out}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
