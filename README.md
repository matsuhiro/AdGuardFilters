# AdGuard Filter Auto-Generation Tool

## Overview

This repository provides a set of scripts to:

- Generate block lists for AdGuard DNS.
- Curate domain lists considered harmful to children in Japanese-speaking regions.
- Create separate files for each category and merge them into a single consolidated list.
- Extract and list only those domains not already included in the public block lists published via `filters.json`.

The scripts download source block lists, compare them against target files, and extract newly appearing domains for use in AdGuard DNS.

## Requirements

- **bash**
- **wget**
- **md5sum** (coreutils)
- **Python 3.6** or higher
- Python standard libraries: `argparse`, `glob`, `datetime`

## Installation

```bash
git clone https://github.com/<your-username>/AdGuardFilters.git
cd AdGuardFilters
chmod +x make_all_filter.sh BlockLists/download_all.sh
```

## Scripts

### `make_all_filter.sh`

1. Change into the `BlockLists` directory and remove the existing `downloads` folder.
2. Run `./download_all.sh` to fetch all BlockLists.
3. Return to the root directory and execute `filter_domains.py` on the specified target files.

```bash
./make_all_filter.sh
```

### `BlockLists/download_all.sh`

- Fetches the `filters.json` file from the AdGuard HostlistsRegistry and extracts each `downloadUrl` entry.
- **Dependencies:** `bash`, `wget`, `jq`, `coreutils` (provides `gmd5sum` or `md5`).
- Downloads all extracted URLs into `BlockLists/downloads/`, naming each file with its MD5 hash and original basename.
- Logs any failed download URLs to `BlockLists/download_failed.log`.

### `filter_domains.py`

- Reads all existing domain lists in `BlockLists/downloads/`.
- Compares them against one or more target files provided as arguments.
- Writes non-duplicate domains for each target to `output/<target>_filters.txt`.
- Checks the validity of each new domain candidate by querying the AdGuard DNS family resolver API (`https://family.adguard-dns.com/resolve?name=<domain>&type=A`). Only domains with `Status=0` are retained.
- Aggregates all valid new domains into `output/all_filters.txt`, prefixed by a header comment with metadata.

## Output Files

- `output/<target>_filters.txt`: New domains for each individual target file.
- `output/all_filters.txt`: Consolidated list of all new domains across targets, with a header containing title, description, homepage, and last modified timestamp.

## Usage

1. Execute `make_all_filter.sh` to perform the full download-and-filter pipeline in one command.
2. Inspect the generated files in the `output/` directory.

## License

This project is released under the MIT License.
