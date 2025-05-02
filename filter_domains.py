#!/usr/bin/env python3
"""
ターゲットファイル（AdGuard DNS 形式のドメインリスト）を既存 BlockLists と突き合わせ、
重複していないドメインだけを

    output/<ターゲット名>_filters.txt   （ターゲットごとの新規ドメイン）
    output/all_filters.txt              （ターゲット全体を統合した新規ドメイン）

に書き出す。

使い方:
    python check_domains.py target1.txt target2.txt ...
"""
import argparse
import glob
import os
import sys
import datetime

# ---------- 共通ユーティリティ ----------
def read_domains_from_file(path: str) -> set[str]:
    """
    ファイルからドメインを読み込んで集合で返す。
    ・空行、'#' で始まるコメント行は無視
    ・前後の空白を除去
    """
    domains: set[str] = set()
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
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
        help="既存リストを格納したディレクトリ（デフォルト: BlockLists/downloads）",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default="output",
        help="出力ディレクトリ（デフォルト: output）",
    )
    args = parser.parse_args()

    # 既存ドメインを収集
    existing_domains: set[str] = set()
    block_files = glob.glob(os.path.join(args.blocklists_dir, "*"))
    if not block_files:
        print(f"[WARN] {args.blocklists_dir} にファイルが見つかりません。")
    for path in block_files:
        if os.path.isfile(path):
            existing_domains |= read_domains_from_file(path)
    print(f"[INFO] BlockLists に含まれるドメイン総数: {len(existing_domains):,}")

    # 出力先を用意
    os.makedirs(args.output_dir, exist_ok=True)

    # 各ターゲットを処理
    union_new_domains: set[str] = set()  # all_filters.txt 用
    for target_path in args.target_files:
        print(f"\n=== 処理中: {target_path} ===")
        target_domains = read_domains_from_file(target_path)
        print(f"[INFO] 取り込み件数: {len(target_domains):,}")

        new_domains = target_domains - existing_domains
        print(f"[INFO] 重複なし新規件数: {len(new_domains):,}")

        # 個別出力
        base = os.path.basename(target_path)
        stem, _ = os.path.splitext(base)
        indiv_out = os.path.join(args.output_dir, f"{stem}_filters.txt")
        write_domains_to_file(indiv_out, new_domains)

        union_new_domains |= new_domains  # 結合用に追加

    # 結合ファイルを出力（ヘッダー付き）
    combined_out = os.path.join(args.output_dir, "all_filters.txt")
    # ヘッダーコメントを生成
    now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
    header_lines = [
        f"! Title: Japan Youth Restricted Filter",
        f"! Description: It contains a blacklist of content considered inappropriate for young people in Japan; restricts inappropriate content on LINE and Yahoo searches.",
        f"! Homepage: https://github.com/matsuhiro/AdGuardFilters",
        f"! Last modified: {now}"
    ]
    try:
        with open(combined_out, 'w', encoding='utf-8') as f:
            # コメントヘッダー
            for line in header_lines:
                f.write(line + '\n')
            f.write('\n')  # ドメインリスト前の空行
            # ドメインリスト本体
            for d in sorted(union_new_domains):
                f.write(d + '\n')
        print(f"[OK] {combined_out} に {len(union_new_domains):,} 件を書き出しました。")
    except OSError as e:
        print(f"[ERROR] {combined_out}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
