package com.wallapp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.util.concurrent.Executors;

public class WallpaperScheduleReceiver extends BroadcastReceiver {
    private static final String TAG = "WallpaperReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            Log.i(TAG, "Device rebooted; re-registering wallpaper schedules");
            WallpaperHelper.rescheduleAllAlarms(context);
            return;
        }

        final String wallpaperPath = intent.getStringExtra("wallpaperPath");
        final String target = intent.getStringExtra("target");
        final PendingResult pendingResult = goAsync();

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                if (wallpaperPath != null && !wallpaperPath.isEmpty()) {
                    WallpaperHelper.applyWallpaperFromPath(
                        context,
                        wallpaperPath,
                        target != null ? target : "BOTH"
                    );
                }
                // Re-arm alarms for the next 24-hour cycle
                WallpaperHelper.rescheduleAllAlarms(context);
            } finally {
                pendingResult.finish();
            }
        });
    }
}
