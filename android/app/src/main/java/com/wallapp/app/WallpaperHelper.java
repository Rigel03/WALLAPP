package com.wallapp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class WallpaperHelper {
    private static final String TAG = "WallpaperHelper";
    public static final String PREFS_NAME = "WallSyncNativePrefs";
    public static final String KEY_WALLPAPERS = "wallpaper_paths_json";
    public static final String KEY_SCHEDULES = "schedules_json";
    public static final String KEY_DEFAULT_TARGET = "default_target";
    public static final String KEY_CURRENT_INDEX = "current_index";

    /**
     * Applies a wallpaper located inside Context.getFilesDir() (Capacitor Directory.Data).
     */
    public static boolean applyWallpaperFromPath(Context context, String relativePath, String target) {
        try {
            File file = new File(context.getFilesDir(), relativePath);
            if (!file.exists()) {
                Log.e(TAG, "Wallpaper file does not exist: " + file.getAbsolutePath());
                return false;
            }

            WallpaperManager wallpaperManager = WallpaperManager.getInstance(context);
            try (InputStream is = new FileInputStream(file)) {
                Bitmap bitmap = BitmapFactory.decodeStream(is);
                if (bitmap == null) {
                    Log.e(TAG, "Failed to decode bitmap from: " + file.getAbsolutePath());
                    return false;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
                    if ("SYSTEM".equalsIgnoreCase(target)) {
                        flags = WallpaperManager.FLAG_SYSTEM;
                    } else if ("LOCK".equalsIgnoreCase(target)) {
                        flags = WallpaperManager.FLAG_LOCK;
                    }
                    wallpaperManager.setBitmap(bitmap, null, true, flags);
                } else {
                    wallpaperManager.setBitmap(bitmap);
                }
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error setting wallpaper", e);
            return false;
        }
    }

    /**
     * Cycles to the next wallpaper stored in SharedPreferences.
     * Used by both the Quick Settings Tile and the Capacitor JS bridge.
     */
    public static String cycleToNextWallpaper(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_WALLPAPERS, "[]");
        String defaultTarget = prefs.getString(KEY_DEFAULT_TARGET, "BOTH");
        int currentIndex = prefs.getInt(KEY_CURRENT_INDEX, -1);

        try {
            JSONArray arr = new JSONArray(jsonStr);
            if (arr.length() == 0) {
                return null;
            }
            int nextIndex = (currentIndex + 1) % arr.length();
            String nextPath = arr.getString(nextIndex);

            boolean ok = applyWallpaperFromPath(context, nextPath, defaultTarget);
            if (ok) {
                prefs.edit().putInt(KEY_CURRENT_INDEX, nextIndex).apply();
                return nextPath;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to cycle wallpaper", e);
        }
        return null;
    }

    /**
     * Registers or updates daily time-based triggers using Android AlarmManager.
     */
    public static void rescheduleAllAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String schedulesStr = prefs.getString(KEY_SCHEDULES, "[]");
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        try {
            JSONArray arr = new JSONArray(schedulesStr);
            // Cancel up to 50 previously indexed alarms first
            for (int i = 0; i < 50; i++) {
                Intent cancelIntent = new Intent(context, WallpaperScheduleReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    2000 + i,
                    cancelIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                alarmManager.cancel(pi);
            }

            List<JSONObject> enabledList = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optBoolean("enabled", true)) {
                    enabledList.add(obj);
                }
            }

            for (int i = 0; i < enabledList.size() && i < 50; i++) {
                JSONObject item = enabledList.get(i);
                String timeStr = item.optString("time", "08:00");
                String wallpaperPath = item.optString("wallpaperPath", "");
                String target = item.optString("target", "BOTH");

                String[] parts = timeStr.split(":");
                if (parts.length != 2 || wallpaperPath.isEmpty()) continue;

                int hour = Integer.parseInt(parts[0]);
                int minute = Integer.parseInt(parts[1]);

                Calendar calendar = Calendar.getInstance();
                calendar.set(Calendar.HOUR_OF_DAY, hour);
                calendar.set(Calendar.MINUTE, minute);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);

                // If the time has already passed today, schedule for tomorrow
                if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                    calendar.add(Calendar.DAY_OF_YEAR, 1);
                }

                Intent intent = new Intent(context, WallpaperScheduleReceiver.class);
                intent.putExtra("wallpaperPath", wallpaperPath);
                intent.putExtra("target", target);
                intent.putExtra("alarmIndex", i);
                intent.putExtra("hour", hour);
                intent.putExtra("minute", minute);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    2000 + i,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                    );
                } else {
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                    );
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling wallpaper alarms", e);
        }
    }
}
