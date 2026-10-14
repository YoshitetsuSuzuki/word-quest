package com.infinitygames.wordquest;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // アプリ内に置いた自作プラグインは、Bridge が立ち上がる前に登録する必要がある。
        registerPlugin(LevelPlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
