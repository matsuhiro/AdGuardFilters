#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AdGuard フィルタールールを最小化し、冗長なパス付きルールやコメント、
ホワイトリスト行を除去してドメイン単独ルール（||example.com^）のみを抽出します。
TLD 単独や ".com"、".rocks" のような強力すぎる単一ラベルホストは除外します。

Usage:
  python minimize_adguard.py [filters.txt]
  cat filters.txt | python minimize_adguard.py
"""
import re
import sys

def minimize_domains(lines):
    """
    lines: 入力フィルタールールの各行文字列リスト
    戻り値: 最小化されたドメイン単独ルールのホストセット
    """
    domains = set()
    for line in lines:
        s = line.strip()
        # 1. '||' で始まらず、またはコメント／ホワイトリスト行はスキップ
        if not s.startswith('||') or s.startswith('@@') or s.startswith('!'):
            continue
        # 2. ホスト部分を抽出（スラッシュ、キャレット、クエリ以降を除外）
        m = re.match(r'^\|\|([^/\^?]+)', s)
        if not m:
            continue
        host = m.group(1)
        # 'www.' プレフィックスを除去
        if host.startswith('www.'):
            host = host[4:]
        # 3. ドットを含まない、または単一ラベルのホストは除外
        clean = host.lstrip('.')
        labels = clean.split('.')
        if len(labels) < 2:
            continue
        domains.add(clean)
    return domains


def main():
    # ファイル指定があればそれを、なければ標準入力から読み込む
    if len(sys.argv) > 1:
        path = sys.argv[1]
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
    else:
        lines = sys.stdin.readlines()

    domains = minimize_domains(lines)
    # ソートして '||host^' 形式で出力
    for host in sorted(domains):
        print(f"||{host}^")

if __name__ == '__main__':
    main()
