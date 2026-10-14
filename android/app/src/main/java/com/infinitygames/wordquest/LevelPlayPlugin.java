package com.infinitygames.wordquest;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.mediation.LevelPlay;
import com.unity3d.mediation.LevelPlayAdError;
import com.unity3d.mediation.LevelPlayAdInfo;
import com.unity3d.mediation.LevelPlayConfiguration;
import com.unity3d.mediation.LevelPlayInitError;
import com.unity3d.mediation.LevelPlayInitListener;
import com.unity3d.mediation.LevelPlayInitRequest;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAd;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAdListener;
import com.unity3d.mediation.rewarded.LevelPlayReward;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * LevelPlay（Unity メディエーション）を JS から使うための橋渡し。
 *
 * ここは「広告会社1社ぶんのネイティブ実装」であり、アプリの都合は一切持ち込まない。
 * JS 側の契約（src/services/ads/types.ts）に合わせて、結果は必ず次の3つで返す。
 *   completed      最後まで見て報酬条件を満たした／全画面が表示されて閉じられた
 *   dismissedEarly 広告は出たが報酬条件の前に閉じられた
 *   unavailable    そもそも出せなかった（在庫なし・未初期化・鍵未設定・タイムアウト）
 *
 * 約束ごと（AdProvider と同じ）:
 *   - show は必ず有限時間で返る。待たせ続けない
 *   - 失敗しても例外を投げない。広告のためにアプリを止めない
 *   - 鍵が未設定なら isAvailable()=false。アプリは広告なしで正常に動く
 */
@CapacitorPlugin(name = "LevelPlay")
public class LevelPlayPlugin extends Plugin {

    /** 広告1回ぶんの呼び出しが、これ以上かかったら諦める時間（ミリ秒）。 */
    private static final long TIMEOUT_MS = 30_000L;

    private final AtomicBoolean initStarted = new AtomicBoolean(false);
    private volatile boolean initSucceeded = false;

    private LevelPlayRewardedAd rewardedAd;
    private LevelPlayInterstitialAd interstitialAd;

    private static String appKey() {
        return BuildConfig.LEVELPLAY_APP_KEY;
    }

    private static boolean hasKey(String s) {
        return s != null && !s.trim().isEmpty();
    }

    // ── JS から呼ばれる面 ────────────────────────────────────────────

    /** 鍵が入っていて、この端末で広告を出しうるか。UI の広告導線の表示判定に使う。 */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", hasKey(appKey()) && hasKey(BuildConfig.LEVELPLAY_REWARDED_UNIT));
        call.resolve(ret);
    }

    /** 起動時に一度だけ呼ばれる。失敗しても投げず、静かに使用不可のままにする。 */
    @PluginMethod
    public void initialize(PluginCall call) {
        if (!hasKey(appKey())) {
            call.resolve(new JSObject().put("initialized", false));
            return;
        }
        if (initSucceeded) {
            call.resolve(new JSObject().put("initialized", true));
            return;
        }
        if (!initStarted.compareAndSet(false, true)) {
            // 初期化が進行中。ここで待たせる意味はないので、そのまま返す。
            call.resolve(new JSObject().put("initialized", false));
            return;
        }
        LevelPlayInitRequest request = new LevelPlayInitRequest.Builder(appKey()).build();
        LevelPlay.init(getContext(), request, new LevelPlayInitListener() {
            @Override
            public void onInitSuccess(LevelPlayConfiguration configuration) {
                initSucceeded = true;
                call.resolve(new JSObject().put("initialized", true));
            }

            @Override
            public void onInitFailed(@NonNull LevelPlayInitError error) {
                initStarted.set(false); // 次回の呼び出しで再試行できるようにする
                call.resolve(new JSObject()
                        .put("initialized", false)
                        .put("error", error.getErrorMessage()));
            }
        });
    }

    /** リワード動画。見終えたかどうかを outcome で返す。 */
    @PluginMethod
    public void showRewarded(PluginCall call) {
        final String unitId = BuildConfig.LEVELPLAY_REWARDED_UNIT;
        if (!initSucceeded || !hasKey(unitId)) {
            resolveOutcome(call, "unavailable");
            return;
        }
        final Activity activity = getActivity();
        if (activity == null) {
            resolveOutcome(call, "unavailable");
            return;
        }

        final Settler settler = new Settler(call);
        settler.armTimeout();

        activity.runOnUiThread(() -> {
            try {
                rewardedAd = new LevelPlayRewardedAd(unitId);
                rewardedAd.setListener(new LevelPlayRewardedAdListener() {
                    private boolean rewarded = false;

                    @Override
                    public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                        activity.runOnUiThread(() -> rewardedAd.showAd(activity));
                    }

                    @Override
                    public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                        settler.settle("unavailable", error.getErrorMessage());
                    }

                    @Override
                    public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                        // 表示された。報酬の判定は onAdRewarded / onAdClosed で行う
                    }

                    @Override
                    public void onAdRewarded(@NonNull LevelPlayReward reward, @NonNull LevelPlayAdInfo adInfo) {
                        rewarded = true;
                    }

                    @Override
                    public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {
                        settler.settle("unavailable", error.getErrorMessage());
                    }

                    @Override
                    public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                        settler.settle(rewarded ? "completed" : "dismissedEarly", null);
                    }
                });
                rewardedAd.loadAd();
            } catch (Throwable t) {
                settler.settle("unavailable", String.valueOf(t.getMessage()));
            }
        });
    }

    /** 全画面広告。表示されて閉じられたら completed。 */
    @PluginMethod
    public void showInterstitial(PluginCall call) {
        final String unitId = BuildConfig.LEVELPLAY_INTERSTITIAL_UNIT;
        if (!initSucceeded || !hasKey(unitId)) {
            resolveOutcome(call, "unavailable");
            return;
        }
        final Activity activity = getActivity();
        if (activity == null) {
            resolveOutcome(call, "unavailable");
            return;
        }

        final Settler settler = new Settler(call);
        settler.armTimeout();

        activity.runOnUiThread(() -> {
            try {
                interstitialAd = new LevelPlayInterstitialAd(unitId);
                interstitialAd.setListener(new LevelPlayInterstitialAdListener() {
                    @Override
                    public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                        activity.runOnUiThread(() -> interstitialAd.showAd(activity));
                    }

                    @Override
                    public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                        settler.settle("unavailable", error.getErrorMessage());
                    }

                    @Override
                    public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                    }

                    @Override
                    public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {
                        settler.settle("unavailable", error.getErrorMessage());
                    }

                    @Override
                    public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                        settler.settle("completed", null);
                    }
                });
                interstitialAd.loadAd();
            } catch (Throwable t) {
                settler.settle("unavailable", String.valueOf(t.getMessage()));
            }
        });
    }

    /**
     * 実機でメディエーションの配線を確認するための公式ツール。
     * ⚠️ 本番広告を自分でタップすると無効トラフィックになる。確認は必ずこれで行う。
     */
    @PluginMethod
    public void launchTestSuite(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || !initSucceeded) {
            call.resolve(new JSObject().put("launched", false));
            return;
        }
        activity.runOnUiThread(() -> LevelPlay.launchTestSuite(activity));
        call.resolve(new JSObject().put("launched", true));
    }

    // ── 中身 ────────────────────────────────────────────────────────

    private static void resolveOutcome(PluginCall call, String outcome) {
        call.resolve(new JSObject().put("outcome", outcome));
    }

    /**
     * 1回の広告呼び出しにつき、ちょうど一度だけ結果を返すための見張り役。
     *
     * LevelPlay のコールバックは「読み込み失敗」「表示失敗」「閉じた」が
     * 重なって飛んでくることがある。二重に resolve すると Capacitor 側が壊れるため、
     * 最初の1回だけを通す。あわせてタイムアウトも持たせ、
     * 「show は必ず有限時間で返る」という AdProvider の約束を守る。
     */
    private final class Settler {
        private final PluginCall call;
        private final AtomicBoolean done = new AtomicBoolean(false);

        Settler(PluginCall call) {
            this.call = call;
        }

        void armTimeout() {
            getBridge().getWebView().postDelayed(
                    () -> settle("unavailable", "timeout"), TIMEOUT_MS);
        }

        void settle(String outcome, String message) {
            if (!done.compareAndSet(false, true)) return;
            JSObject ret = new JSObject().put("outcome", outcome);
            if (message != null) ret.put("message", message);
            call.resolve(ret);
        }
    }
}
