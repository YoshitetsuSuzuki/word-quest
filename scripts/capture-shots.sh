#!/bin/bash
# App Store撮影: 指定画面を初期表示にしてビルド→インストール→撮影を自動で繰り返す
set -e
cd /Users/yoshitetsu/英単語資産アプリ
DEV="iPhone 17 Pro Max"
BID="com.infinitygames.wordquest"
DIR="/Users/yoshitetsu/英単語資産アプリ/appstore-screenshots"
PROJ="/Users/yoshitetsu/英単語資産アプリ/ios/App/App.xcodeproj"
mkdir -p "$DIR"

# クリーンなステータスバー(冪等)
xcrun simctl status_bar "$DEV" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName "" || true

capture() {
  local screen="$1" out="$2" wait="$3"
  echo "### $out ($screen) build..."
  CAP=1 VITE_DEMO=1 VITE_DEMO_SCREEN="$screen" npx vite build >/dev/null 2>&1
  npx cap sync ios >/dev/null 2>&1
  xcodebuild -project "$PROJ" -scheme App -sdk iphonesimulator -configuration Debug \
    -derivedDataPath /tmp/wq-build -destination "platform=iOS Simulator,name=$DEV" \
    build CODE_SIGNING_ALLOWED=NO >/tmp/wq-cap.log 2>&1
  local APP="/tmp/wq-build/Build/Products/Debug-iphonesimulator/App.app"
  xcrun simctl terminate "$DEV" "$BID" >/dev/null 2>&1 || true
  xcrun simctl install "$DEV" "$APP" >/dev/null 2>&1
  xcrun simctl launch "$DEV" "$BID" >/dev/null 2>&1
  sleep "$wait"
  xcrun simctl io "$DEV" screenshot "$DIR/$out" >/dev/null 2>&1
  echo "### $out done"
}

capture quiz    02-quiz.png    9
capture ranking 03-ranking.png 7
capture study   04-study.png   7
echo "ALL DONE"
