#!/usr/bin/env bash
#
# 打断地基，看哪些门禁还绿着。
#
#   跑法：bash scripts/cut.sh            两刀都跑
#         bash scripts/cut.sh A          只跑一刀
#
# ## 这把刀回答的问题，别的办法回答不了
#
# CLAUDE.md 里「验这一类只有一个办法：打断它」写了很多遍，而从前没有工具，
# 于是每个人各自手改一处、跑一次、还原——**改哪一处全凭当时想到什么**。
# 这支把「打断」定成两刀，两刀各废掉一整层地基：
#
#     A  meetsAll 恒真       所有 requires 一律通过 → 该被条件挡住的内容全部放行
#     B  applyEffects 空转   效果一件也不落地       → 旗标/年表/属性全不变
#
# 跑完拿三份输出（基线 + 两刀）交叉，得到的是一句**别的办法问不出来的话**：
#
#     这一支到底在守什么？
#
# 2026-09-12 头一次跑出来的数，留在这儿当基线（干净树 `cb36bf3`，108 支）：
#
#     基线    绿 107  红 1（lifelong，1/6000 那一世）
#     A 刀    绿  55  红 53
#     B 刀    绿  56  红 52
#     两刀都绿 44 支
#
# **把条件层彻底废掉，一半门禁毫无反应。**
#
# ## ⚠️ 「打断后还绿」是名单，不是判决
#
# `replay`（验种子）、`savefile`（验存档往返）、`doors`（验出口）本来就不该因这两刀变红，
# 绿是对的。四支走查支（`perceive`/`royal`/`settle`/`shadow`）压根不判成败，更不会红。
#
# 真正要分的是这两类，而分辨靠**判据的形状**，不靠文件头也不靠措辞：
#
#     抓不住条件层   断言「这条路走得通」        从 open 选 press 走到 told
#     抓得住条件层   断言「不同情形去不同地方」   贫户走到 choose、中等户走到 tighten
#
# 前一种的 `next` 写死在内容里，条件层废不废它都走到那儿——**不红是对的，
# 只是它只守了骨架**。`scripts/hardship.ts` 第九条是照这个改出来的第一例：
# 旧八条在 A 刀下纹丝不动，新一条当场三红。
#
# ## 为什么是这两刀，不是别的
#
# 挑地基不挑枝叶：`meetsAll` 和 `applyEffects` 是全库内容唯二的必经之路。
# 打断枝叶（改某一卷某一句）只能验到那一卷，而这两刀一次问遍所有支。
#
set -u
cd "$(dirname "$0")/.."
OUT="node_modules/.tmp"
WANT="${1:-AB}"

# ⚠️ 安全闸：这支会真的改 src/。共享工作区里跑它，别人的未提交改动会跟着一起被改坏，
# 而 trap 还原只还原得了我备份过的那两个文件。所以工作区不干净就不跑。
#
# ⚠️ 问的是 `git diff` 不是 `git status --porcelain`——**两条命令对「改了没有」的答案不一致**。
# `status` 比 stat 缓存（大小、时间戳），文件被重写过就报 `M`，哪怕内容一个字节没变；
# `diff` 比内容。Windows 上 autocrlf 一开，任何被 LF 重写过的文件都会让 `status` 亮 `M`，
# 而 `diff` 说没差。头一版用 `status`，结果**这支在自己的干净树里都跑不起来**——
# 上一轮还原时按 LF 写回，`status` 就一直亮着。
# （同「文件『有改动』不等于逻辑变了」那一条：换行符差异和真改动印成同一个 `M`。）
if [ -n "$(git diff --name-only src/)" ]; then
  echo "✗ src/ 有未提交的改动，不跑。这支会改 src/ 再还原，脏工作区里跑会动到别人的改动。"
  echo "  动了的是：$(git diff --name-only src/ | tr '\n' ' ')"
  echo "  去自己的 worktree：git worktree add --detach ../xiuxian-game-wt/cut HEAD"
  exit 1
fi

FILES="src/engine/conditions.ts src/engine/effects.ts"
restore() { for f in $FILES; do cp "$OUT/bak-$(basename "$f")" "$f"; done; }
trap restore EXIT
for f in $FILES; do git show "HEAD:$f" > "$OUT/bak-$(basename "$f")"; done

run_one() {
  echo "=== 跑「$1」==="
  SEED="${SEED:-cut}" bun scripts/gates.ts > "$OUT/cut-$1.txt" 2>&1
  # ⚠️ 数的是**门禁级**那一行（`✓  12.3s  名字`），不是每条判据。
  # 头一版按 `^  ✓ ` 数，印出「绿 181 红 200」——而门禁一共 108 支。
  # 判据明细和门禁汇总用的是同一个 ✓／✗，只有秒数那一栏能把两者分开。
  local g r
  g=$(grep -cE '^\s*✓\s+[0-9.]+s\s' "$OUT/cut-$1.txt")
  r=$(grep -cE '^\s*✗\s+[0-9.]+s\s' "$OUT/cut-$1.txt")
  echo "  $((g + r)) 支：绿 $g  红 $r  → $OUT/cut-$1.txt"
}

patch() {                                     # $1=文件 $2=函数签名 $3=插进去的那一行
  python - "$1" "$2" "$3" <<'PY'
import sys
path, sig, line = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path, encoding='utf-8').read()
n = s.count(sig)
# 匹配数要断言。匹配 0 处时 replace 是**静默空操作**，整轮跑下来全绿，
# 看上去正是「打断了但判据没红」——比假阳性坏，它伪装成已经验过了。
assert n == 1, f'签名匹配 {n} 处，不是 1——{path} 改过了，先对一遍再跑'
open(path, 'w', encoding='utf-8', newline='\n').write(s.replace(sig, sig + '\n' + line, 1))
print(f'  打断了 {path}')
PY
}

case "$WANT" in *A*)
  restore
  patch src/engine/conditions.ts \
    'export function meetsAll(conditions?: readonly Condition[]): boolean {' \
    '  return true // CUT-A'
  run_one A-meetsAll-true ;;
esac

case "$WANT" in *B*)
  restore
  patch src/engine/effects.ts \
    'export function applyEffects(effects?: readonly Effect[]): NarrativeBlock[] {' \
    '  return [] // CUT-B'
  run_one B-effects-noop ;;
esac

restore
echo "=== 还原完毕 ==="
# 还原不能只看 git status——CRLF 会让每个文件都显示 M。看有没有打断标记留下。
if grep -rqn 'CUT-A\|CUT-B' src/; then
  echo "✗ src/ 里还有打断标记没清干净，手工查：grep -rn 'CUT-' src/"
  exit 1
fi
echo "  src/ 里没有残留的打断标记。"
