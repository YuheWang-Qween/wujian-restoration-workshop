#!/bin/bash
set -Eeuo pipefail

# 生成中文衬线字体子集（Noto Serif SC → woff2）
#
# 为什么要子集化：整套 Noto Serif SC 单字重 ~11MB，不可能直接上线；
# 而本项目的衬线字用在标题、名签、释文引用等处，字符集就是仓库里的静态文案。
# 本脚本扫描 src/ 下全部 ts/tsx 里的字符做子集，产物每字重只有几百 KB。
#
# 何时重跑：content.ts / exhibition.ts / 页面文案新增了「以前没出现过的汉字」之后。
# 忘了重跑也不炸：缺字的那个字符会回退到系统字体（font-display: swap 链上的
# Songti SC / SimSun / serif），只是那一个字的字形略有差异。
#
# 依赖：python3 + fonttools + brotli（pip install fonttools brotli）
# 源字体：assets/fonts/NotoSerifSC-{Regular,SemiBold}.otf
#（来自 https://github.com/notofonts/noto-cjk，OFL 许可）

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_FONTS="${ROOT}/assets/fonts"
OUT_DIR="${ROOT}/public/fonts"
CHARS_FILE="$(mktemp)"

mkdir -p "${OUT_DIR}"

# 1) 收集 src/ 里出现过的全部字符（含中英文与标点），外加 ASCII 可打印区兜底
python3 - "$ROOT" "$CHARS_FILE" <<'PY'
import pathlib, sys

root = pathlib.Path(sys.argv[1]) / 'src'
chars = set(chr(c) for c in range(0x20, 0x7F))  # ASCII 可打印区
for p in root.rglob('*'):
    if p.suffix in ('.ts', '.tsx', '.css'):
        chars |= set(p.read_text(encoding='utf-8', errors='ignore'))
# 空白符只留半角与全角空格：U+3000 出现在释文与「{ordinal}　{name}」排版里，
# 剔掉它会让 serif 行内逐字回退到系统字体，字距突变
chars = {c for c in chars if (not c.isspace()) or c in (' ', '　')}
pathlib.Path(sys.argv[2]).write_text(''.join(sorted(chars)), encoding='utf-8')
print(f'collected {len(chars)} unique chars')
PY

# 2) 逐字重子集化为 woff2
subset() {
  local src="$1" out="$2"
  pyftsubset "${src}" \
    --text-file="${CHARS_FILE}" \
    --flavor=woff2 \
    --layout-features='*' \
    --drop-tables+=FFTM \
    --output-file="${out}"
  echo "$(du -h "${out}" | cut -f1)  ${out}"
}

subset "${SRC_FONTS}/NotoSerifSC-Regular.otf"  "${OUT_DIR}/noto-serif-sc-subset-regular.woff2"
subset "${SRC_FONTS}/NotoSerifSC-SemiBold.otf" "${OUT_DIR}/noto-serif-sc-subset-semibold.woff2"

# 3) 覆盖率校验：pyftsubset 会静默丢弃源字体没有的字符，这里显式报出来。
#    缺的字符会走 CSS 回退链（globals.css --font-serif），不算错误但必须可见。
PYBIN="$(dirname "$(command -v pyftsubset)")/python3"
[ -x "${PYBIN}" ] || PYBIN=python3
"${PYBIN}" - "${CHARS_FILE}" "${OUT_DIR}/noto-serif-sc-subset-regular.woff2" <<'PY'
import sys
from fontTools.ttLib import TTFont

chars = set(open(sys.argv[1], encoding='utf-8').read())
cmap = set()
for table in TTFont(sys.argv[2])['cmap'].tables:
    cmap |= set(table.cmap.keys())
missing = sorted(c for c in chars if ord(c) not in cmap)
if missing:
    print(f'⚠ {len(missing)} 个字符源字体无字形、未进子集（将走回退链渲染）：')
    print('  ' + ' '.join(f'{c}(U+{ord(c):04X})' for c in missing))
else:
    print('覆盖率校验通过：收集的字符全部进入子集。')
PY

rm -f "${CHARS_FILE}"
echo "Done. 对应的 @font-face 声明在 src/app/globals.css。"
