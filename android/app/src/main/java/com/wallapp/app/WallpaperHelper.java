package com.wallapp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
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
    private static final int MAX_ALARMS = 50;
    private static final int ALARM_REQUEST_BASE = 2000;

    /** Absolute app-private folder that holds every wallpaper (and its thumbnail). */
    public static File wallpaperDir(Context context) {
        return new File(context.getFilesDir(), "wallpapers");
    }

    /**
     * Decodes an image from app storage, centre-crops it to the screen and applies it.
     * Throws with a human-readable message so the UI can show the real reason on failure.
     */
    public static void applyWallpaper(Context context, String relativePath, String target) throws Exception {
        File file = new File(context.getFilesDir(), relativePath);
        if (!file.exists()) {
            throw new IOException("Image file is missing: " + relativePath);
        }

        WallpaperManager wm = WallpaperManager.getInstance(context);
        if (!wm.isWallpaperSupported()) {
            throw new IOException("This device does not support wallpapers");
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !wm.isSetWallpaperAllowed()) {
            throw new IOException("Changing wallpaper is blocked on this device");
        }

        DisplayMetrics dm = context.getResources().getDisplayMetrics();
        int screenW = Math.max(1, dm.widthPixels);
        int screenH = Math.max(1, dm.heightPixels);

        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IOException("Image could not be read (corrupt file?)");
        }

        int sample = 1;
        while ((bounds.outWidth / (sample * 2)) >= screenW && (bounds.outHeight / (sample * 2)) >= screenH) {
            sample *= 2;
        }

        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = sample;
        opts.inPreferredConfig = Bitmap.Config.ARGB_8888;
        Bitmap source = BitmapFactory.decodeFile(file.getAbsolutePath(), opts);
        if (source == null) {
            throw new IOException("Image could not be decoded");
        }

        Bitmap cropped = centerCrop(source, screenW, screenH);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                int flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
                if ("SYSTEM".equalsIgnoreCase(target)) {
                    flags = WallpaperManager.FLAG_SYSTEM;
                } else if ("LOCK".equalsIgnoreCase(target)) {
                    flags = WallpaperManager.FLAG_LOCK;
                }
                wm.setBitmap(cropped, null, true, flags);
            } else {
                wm.setBitmap(cropped);
            }
        } finally {
            if (cropped != source) cropped.recycle();
            source.recycle();
        }

        rememberIndex(context, relativePath);
    }

    /** Boolean wrapper for background callers (alarm receiver, tile). Logs the failure. */
    public static boolean tryApplyWallpaper(Context context, String relativePath, String target) {
        try {
            applyWallpaper(context, relativePath, target);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Could not apply wallpaper " + relativePath, e);
            return false;
        }
    }

    private static Bitmap centerCrop(Bitmap src, int targetW, int targetH) {
        int w = src.getWidth();
        int h = src.getHeight();
        float scale = Math.max((float) targetW / w, (float) targetH / h);
        int cropW = Math.min(w, Math.round(targetW / scale));
        int cropH = Math.min(h, Math.round(targetH / scale));
        int x = Math.max(0, (w - cropW) / 2);
        int y = Math.max(0, (h - cropH) / 2);
        Matrix m = new Matrix();
        m.postScale(scale, scale);
        return Bitmap.createBitmap(src, x, y, cropW, cropH, m, true);
    }

    private static void rememberIndex(Context context, String relativePath) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(KEY_WALLPAPERS, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                if (relativePath.equals(arr.getString(i))) {
                    prefs.edit().putInt(KEY_CURRENT_INDEX, i).apply();
                    return;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not store current index", e);
        }
    }

    /**
     * Applies the next wallpaper in the saved list. Shared by the Quick Settings tile and the JS bridge.
     * Returns the applied relative path, or null when the list is empty / every image failed.
     */
    public static String cycleToNextWallpaper(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String defaultTarget = prefs.getString(KEY_DEFAULT_TARGET, "BOTH");
        int current = prefs.getInt(KEY_CURRENT_INDEX, -1);

        try {
            JSONArray arr = new JSONArray(prefs.getString(KEY_WALLPAPERS, "[]"));
            int count = arr.length();
            for (int step = 1; step <= count; step++) {
                int idx = ((current + step) % count + count) % count;
                String path = arr.getString(idx);
                if (tryApplyWallpaper(context, path, defaultTarget)) {
                    return path;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to cycle wallpaper", e);
        }
        return null;
    }

    public static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    /** Re-arms one alarm per enabled schedule (next occurrence). Call after every change and after every fire. */
    public static void rescheduleAllAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        try {
            for (int i = 0; i < MAX_ALARMS; i++) {
                am.cancel(buildPendingIntent(context, i, new Intent(context, WallpaperScheduleReceiver.class)));
            }

            JSONArray arr = new JSONArray(prefs.getString(KEY_SCHEDULES, "[]"));
            List<JSONObject> enabled = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optBoolean("enabled", true)) enabled.add(obj);
            }

            boolean exact = canScheduleExact(context);
            for (int i = 0; i < enabled.size() && i < MAX_ALARMS; i++) {
                JSONObject item = enabled.get(i);
                String wallpaperPath = item.optString("wallpaperPath", "");
                String[] parts = item.optString("time", "08:00").split(":");
                if (parts.length != 2 || wallpaperPath.isEmpty()) continue;

                Calendar cal = Calendar.getInstance();
                cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
                cal.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
                cal.set(Calendar.SECOND, 0);
                cal.set(Calendar.MILLISECOND, 0);
                if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
                    cal.add(Calendar.DAY_OF_YEAR, 1);
                }

                Intent intent = new Intent(context, WallpaperScheduleReceiver.class);
                intent.putExtra("wallpaperPath", wallpaperPath);
                intent.putExtra("target", item.optString("target", "BOTH"));
                PendingIntent pi = buildPendingIntent(context, i, intent);

                try {
                    if (exact) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
                    } else {
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
                    }
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling wallpaper alarms", e);
        }
    }

    private static PendingIntent buildPendingIntent(Context context, int index, Intent intent) {
        return PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_BASE + index,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
