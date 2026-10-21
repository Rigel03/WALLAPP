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

        final Context app = context.getApplicationContext();
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.i(TAG, "Re-registering wallpaper schedules after " + action);
            WallpaperHelper.rescheduleAllAlarms(app);
            return;
        }

        final String wallpaperPath = intent.getStringExtra("wallpaperPath");
        final String target = intent.getStringExtra("target");
        final PendingResult pendingResult = goAsync();

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                if (wallpaperPath != null && !wallpaperPath.isEmpty()) {
                    WallpaperHelper.tryApplyWallpaper(app, wallpaperPath, target != null ? target : "BOTH");
                }
                // Arm the next occurrence (tomorrow) for every schedule.
                WallpaperHelper.rescheduleAllAlarms(app);
            } finally {
                pendingResult.finish();
            }
        });
    }
}
