#!/usr/bin/env bash
rm ichigo_filter.txt
rm kujira_filter.txt
rm nocoin.txt
wget https://raw.githubusercontent.com/eEIi0A5L/adblock_filter/master/ichigo_filter.txt
wget https://raw.githubusercontent.com/eEIi0A5L/adblock_filter/master/kujira_filter.txt
wget https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt
python3 minimize_adguard.py ichigo_filter.txt > min_adult.txt
python3 minimize_adguard.py kujira_filter.txt > min_coin.txt
python3 minimize_adguard.py nocoin.txt > min_nocoin.txt
cp ../porn.txt porn_copy.txt
sort -u min_adult.txt porn_copy.txt > ../porn.txt
cp ../coin.txt coin_copy.txt
sort -u min_nocoin.txt coin_copy.txt > ../coin.txt
cp ../coin.txt coin_copy.txt
sort -u min_coin.txt coin_copy.txt > ../coin.txt
