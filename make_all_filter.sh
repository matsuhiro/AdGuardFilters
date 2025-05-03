#!/usr/bin/env bash
cd BlockLists
rm -rf downloads
./download_all.sh
cd ..
python3 filter_domains.py annonymous.txt casino.txt drag.txt line.txt porn.txt suside.txt violence.txt bbs.txt comic.txt fishing.txt matching.txt social.txt wepon.txt yahoojp.txt rakuten.txt
