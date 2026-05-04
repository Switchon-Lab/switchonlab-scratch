# シナリオ条件チェック 設計ガイド

check-conditions.js で使える条件タイプの選び方と、よくある誤判定パターンをまとめたガイド。
新しいレッスン JSON を書くときはこのガイドを先に参照すること。

---

## 条件タイプ 選択ルール

| 条件タイプ | 主な用途 | 孤立ブロック誤検出 |
|-----------|---------|:---------:|
| `blockExists` | 単純な存在確認のみ（値・接続は問わない） | あり |
| `hasBlockWithField` | ドロップダウン直接フィールドの確認 | あり |
| `hasNestedBlock` | 親チェーン内に子ブロックが接続されているか | なし |
| `hasNestedBlockWithInput` | チェーン内の子ブロックの**数値入力**を確認 | なし |
| `hasNestedBlockWithField` | チェーン内の子ブロックの**ドロップダウン値**を確認 | なし |
| `hasBlockInInput` | boolean入力スロットに直接接続されているか | なし |
| `soundPlayWithName` | `sound_play` が特定の音名を使っているか | なし |
| `ifKeyInForever` | `control_forever` 内の `control_if` のキー確認 | なし |
| `waitUntilNotKey` | `control_wait_until` の NOT＋keypressed 確認 | なし |

**原則: 「値」「ドロップダウン」「接続状態」のいずれかを検証したいなら `blockExists` / `hasBlockWithField` は使わない。**

---

## よくある誤判定パターン と 正しい書き方

### ① `control_stop` のドロップダウン確認

```json
// NG: 値未確認、孤立ブロックも拾う
{ "type": "blockExists", "opcode": "control_stop" }
{ "type": "hasBlockWithField", "opcode": "control_stop", ... }

// OK: 接続済みかつ "other scripts in sprite" を選択している
{
  "type": "hasNestedBlockWithField",
  "parentOpcode": "event_whenbroadcastreceived",
  "childOpcode": "control_stop",
  "field": "STOP_OPTION",
  "value": "other scripts in sprite"
}
// Hippo1スクリプト（wait_until チェーン）の場合は parentOpcode: "control_wait_until"
```

### ② `sound_play` の音名確認

```json
// NG: 音名未確認
{ "type": "blockExists", "opcode": "sound_play" }

// OK: 音名を確認
{ "type": "soundPlayWithName", "name": "Screech" }
```

### ③ boolean入力スロット（「または」「かつ」など）の確認

```json
// NG: 孤立した operator_or も拾う
{ "type": "blockExists", "opcode": "operator_or" }

// OK: control_wait_until の CONDITION 入力に直接接続されているか確認
{
  "type": "hasBlockInInput",
  "parentOpcode": "control_wait_until",
  "inputKey": "CONDITION",
  "childOpcode": "operator_or"
}
```

### ④ 変数の初期値確認（スコア 0 など）

```json
// NG: 値未確認
{ "type": "blockExists", "opcode": "data_setvariableto" }

// OK: ハットブロックのチェーン内にあり VALUE=0 であるか確認
{
  "type": "hasNestedBlockWithInput",
  "parentOpcode": "event_whenflagclicked",
  "childOpcode": "data_setvariableto",
  "field": "VALUE",
  "value": 0
}
```

### ⑤ クローンスクリプト内のブロック確認

```json
// OK: control_start_as_clone (ハットブロック) のチェーン内を確認
{
  "type": "hasNestedBlockWithInput",
  "parentOpcode": "control_start_as_clone",
  "childOpcode": "motion_gotoxy",
  "field": "X",
  "value": 240
}
```

---

## Scratch ブロック構造メモ

### ハットブロック vs Cブロック

| 種別 | 例 | 子ブロックの場所 |
|------|---|----------------|
| ハットブロック | `event_whenflagclicked`, `control_start_as_clone`, `event_whenbroadcastreceived` | `.next` |
| Cブロック | `control_forever`, `control_repeat`, `control_if` | `.inputs.SUBSTACK.block` |
| スタックブロック | `control_wait_until`, `motion_gotoxy` など | `.next`（次のブロック） |

`hasNestedBlock` / `hasNestedBlockWithInput` / `hasNestedBlockWithField` はいずれも SUBSTACK と next の両方に対応済み。

### 入力値の読み取り方針

- **数値入力**（テキスト編集フィールド）: `input.shadow || input.block` → shadow 優先
- **boolean入力**（六角形の穴）: `input.block` のみ（`input.shadow` に古いブロックが残存して誤検出する場合あり）

### ドロップダウンの種別

| 種別 | 例 | 取得方法 |
|------|---|---------|
| 直接 FIELD | `control_stop.STOP_OPTION` | `block.fields[fieldName].value` |
| shadow INPUT 経由 | `control_create_clone_of.CLONE_OPTION`, `sensing_keypressed.KEY_OPTION` | `input.shadow` → `menuBlock.fields[fieldName].value` |

`hasBlockWithField` は両方に対応済み。

---

## 新レッスン条件設計フロー

1. **途中ステップ（step1〜N-2）**: 存在確認中心で OK（厳しすぎると詰まる）
2. **最終確認ステップ（step-N）**: 全条件を厳密にチェック（値・ドロップダウン・接続状態）
3. ドロップダウン付きブロック（`control_stop`, `sound_play`, `control_create_clone_of` など）は**常に値も確認**
4. 条件に `targetName` を付ける場合はステップの `targetName` と一致させる（個別条件の `targetName` はメタデータのみ、実際のターゲット検索はステップ側の値が使われる）

---

## 条件タイプ 詳細パラメータ一覧

```
blockExists          opcode
hasBlockWithField    opcode, field, value
hasNestedBlock       parentOpcode, childOpcode
hasNestedBlockWithInput   parentOpcode, childOpcode, field, value（数値比較）
hasNestedBlockWithField   parentOpcode, childOpcode, field, value（文字列比較）
hasBlockInInput      parentOpcode, inputKey, childOpcode
soundPlayWithName    name
ifKeyInForever       key
waitUntilNotKey      key
inputValue           opcode, field, value
randomValue          from, to
keyMovePair          key, opcode, field, value
```
