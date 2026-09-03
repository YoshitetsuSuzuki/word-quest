// ============================================================================
// GameCenterPlugin.swift  自作 Capacitor プラグイン（Apple Game Center / GameKit）
//
//   本物のリーダーボード・実績を提供する。JS 側は src/services/GameCenterService.ts。
//   第三者プラグインに依存しない Capacitor 8 準拠の実装。
//
//   ▼ 使い方は docs/game-center-setup.md 参照。
//     1. このファイルを App ターゲットに追加
//     2. App ターゲットに Game Center capability を追加
//     3. App Store Connect でリーダーボード/実績を作成（ID は GameCenterService.ts と一致）
// ============================================================================
import Foundation
import Capacitor
import GameKit
import StoreKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
    ]

    private var authenticated = false

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func signIn(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        player.authenticateHandler = { [weak self] vc, error in
            if let vc = vc {
                // サインインUIを提示
                DispatchQueue.main.async {
                    self?.bridge?.viewController?.present(vc, animated: true)
                }
                return
            }
            self?.authenticated = player.isAuthenticated
            call.resolve(["authenticated": player.isAuthenticated])
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId") else {
            call.reject("leaderboardId required"); return
        }
        let score = call.getInt("score") ?? 0
        if #available(iOS 14.0, *) {
            GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        } else {
            let s = GKScore(leaderboardIdentifier: leaderboardId)
            s.value = Int64(score)
            GKScore.report([s]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }

    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard let achievementId = call.getString("achievementId") else {
            call.reject("achievementId required"); return
        }
        let percent = call.getDouble("percentComplete") ?? 0
        let a = GKAchievement(identifier: achievementId)
        a.percentComplete = percent
        a.showsCompletionBanner = true
        GKAchievement.report([a]) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let vc: GKGameCenterViewController
            if #available(iOS 14.0, *) {
                if let id = call.getString("leaderboardId") {
                    vc = GKGameCenterViewController(leaderboardID: id, playerScope: .global, timeScope: .allTime)
                } else {
                    vc = GKGameCenterViewController(state: .leaderboards)
                }
            } else {
                vc = GKGameCenterViewController()
                vc.viewState = .leaderboards
            }
            vc.gameCenterDelegate = self
            self?.bridge?.viewController?.present(vc, animated: true)
            call.resolve()
        }
    }

    @objc func showAchievements(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let vc: GKGameCenterViewController
            if #available(iOS 14.0, *) {
                vc = GKGameCenterViewController(state: .achievements)
            } else {
                vc = GKGameCenterViewController()
                vc.viewState = .achievements
            }
            vc.gameCenterDelegate = self
            self?.bridge?.viewController?.present(vc, animated: true)
            call.resolve()
        }
    }

    // App Store レビュー依頼（SKStoreReviewController）。
    // 表示するかどうかは最終的に OS が判断する（年3回上限などApple側で制御）。
    // 呼び出しタイミングの節度（節目のみ・低頻度）は JS 側 ReviewPromptService が担う。
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            call.resolve()
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
