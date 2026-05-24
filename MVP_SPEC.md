# MVP_SPEC（Phase 2.15 整理版）

## 1. MVPの目的
36ヶ月通して遊べて、複数の行動方針に意味があり、**クリア / 未達 / ゲームオーバー**が納得できる形で完走できる状態をMVP到達点とする。

## 2. 現在の終了判定
- 途中到達では即クリアしない
- 36ヶ月目の行動後にのみ `clear / timeUp` を確定
- `gameOver` は途中でも即時発生
- 優先順位は `gameOver > clear > timeUp`
- 36ヶ月目開始時点では行動可能
- 終了後は通常行動不可
- リスタートのみ可能

## 3. stateの主要項目
- month
- cash
- investmentBalance
- debt
- hp
- stress
- stressDangerMonths
- income
- livingCost（`lifePlanLevel` から決定）
- lifePlanLevel
- sidejobFatigue
- mainJobScore
- investmentType
- investmentStreak
- sellCount（※未実装。将来候補）
- refreshCount（※未実装。将来候補）
- finished
- resultType
- gameOver
- cleared
- reachedTargetOnce
- firstReachMonth
- maxNetWorth
- maxNetWorthMonth
- history

## 4. history仕様
- 有効行動1回につき1件保存
- 無効操作では増えない
- 終了後操作では増えない
- 保存項目:
  - month
  - cash
  - investmentBalance
  - debt
  - netWorth
  - hp
  - stress
  - action
  - eventName
  - investmentType
  - sidejobFatigue
  - mainJobScore
- 用途:
  - 資産推移グラフ
  - リザルト集計
  - 将来の実績/バッジ拡張

## 5. 行動ごとの仕様（現行）
- 本業に集中する
- 副業を頑張る
- 休養する
- 投資を増やす
- 借金する
- リフレッシュする
- 生活を見直す
- 売却する

共通ガード:
- 無効操作は no-op（stateを変更しない）

重要制約:
- 投資タイプ上書き禁止
- 借金20万円以上で投資不可
- 借金30万円以上で追加借入不可
- 投資評価額0では売却不可
- 売却ターンは月次処理あり（収入・生活費・イベント・判定）

## 6. 追加影響システム
- 高ストレス疲労
- 投資連続リスク
- 副業と投資の両立疲れ
- 追加影響は上部イベントカード / 月次サマリー / イベントログで表示
- 複数追加影響は併記

## 7. リザルト仕様
- 表示位置: 最新イベント直下
- 表示内容:
  - 結果
  - 最終純資産
  - 目標との差表示
  - 初回到達月
  - 最高純資産
  - メーター
  - バッジ
  - ひとことコメント
  - 詳細折りたたみ
  - 資産推移グラフ（純資産）
- historyが少ない場合:
  - グラフに案内文を表示しエラー回避

## 8. デバッグモード仕様（`?debug=1`）
- 表示条件: URLクエリ `debug=1` のときのみ
- 機能:
  - State確認
  - State反映
  - Stateコピー
  - イベント固定
  - プリセット
  - サンプルhistory生成
  - リザルトプレビュー
- 通常URLでは表示しない

## 9. 回帰テスト仕様（`tests/regression.js`）
- 36ヶ月判定
- clear / timeUp / gameOver
- no-opガード
- 投資タイプ上書き禁止
- 売却処理
- ストレス危険
- history増分と内容
- サンプルhistory整合性
- デバッグURL gating

## 10. MVP後の候補（未実装）
- 中期イベント
- 複数イベント制
- 副業Lv
- 本業Lv / 転職
- アイテム
- 生活レベル
- エンディング分岐
- 永続バッジ / 実績
- 攻略ガイド
- 借金返済モード
- FIREモード
- 学生モード
- 子ども育成モード
- コレクターモード
- スマホ向けUI再設計
- 資産推移グラフの複数ライン化（現金/投資評価額/借金）
- 体力・ストレス推移グラフ
- 家計簿ログ
- セーブ / ロード

## 表記統一メモ（現行仕様）
- 目標純資産200万円
- 本業に集中する
- リフレッシュする
- 投資評価額 / 評価額
- 36ヶ月終了時点で判定
- 途中到達では即クリアしない

## Phase 2.17: MVP v1.0候補チェック記録

### MVPで実装済みの主要機能
- 36ヶ月プレイサイクル
- 8行動 + 投資タイプ差分 + 売却月次処理
- no-opガードと終了後操作ロック
- clear / timeUp / gameOver の終了分岐
- reachedTargetOnce / firstReachMonth / maxNetWorth / history
- リザルト（判定、差分、メーター、バッジ、詳細、資産推移グラフ）
- `?debug=1` デバッグパネル（state編集、プリセット、サンプルhistory、リザルトプレビュー）
- Node回帰テスト（`tests/regression.js`）

### MVPで確認済みの主要仕様
- 36ヶ月終了時点でクリア判定
- 途中到達では即クリアしない
- `gameOver > clear > timeUp`
- 無効操作はstate不変
- 終了後は通常行動不可

### MVP後候補（未実装）
- 体力・ストレスのメーター化
- リフレッシュ / 生活見直しの特別ボタン化
- スマホUI整理
- 攻略ガイド
- 永続バッジ / 実績
- 中期イベント
- 副業Lv
- 転職・借金返済・FIRE・学生などの別モード
- 複数ライン資産グラフ
- 体力 / ストレス推移グラフ
- セーブ / ロード
