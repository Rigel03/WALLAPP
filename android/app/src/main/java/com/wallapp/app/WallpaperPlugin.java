package com.wallapp.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "WallpaperPlugin")
public class WallpaperPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(WallpaperHelper.PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Writes an already-downscaled JPEG (and its thumbnail) into app-private storage. */
    @PluginMethod
    public void saveImage(PluginCall call) {
        String id = call.getString("id");
        String data = call.getString("data");
        String thumb = call.getString("thumb");
        if (id == null || id.isEmpty() || data == null || data.isEmpty()) {
            call.reject("id and data are required");
            return;
        }
        try {
            File dir = WallpaperHelper.wallpaperDir(getContext());
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not create storage folder");
                return;
            }
            writeBase64(new File(dir, "wp_" + id + ".jpg"), data);
            if (thumb != null && !thumb.isEmpty()) {
                writeBase64(new File(dir, "th_" + id + ".jpg"), thumb);
            }
            JSObject ret = new JSObject();
            ret.put("path", "wallpapers/wp_" + id + ".jpg");
            ret.put("thumbPath", "wallpapers/th_" + id + ".jpg");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save image: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteImage(PluginCall call) {
        String id = call.getString("id");
        if (id != null && !id.isEmpty()) {
            File dir = WallpaperHelper.wallpaperDir(getContext());
            new File(dir, "wp_" + id + ".jpg").delete();
            new File(dir, "th_" + id + ".jpg").delete();
        }
        call.resolve();
    }

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        String filePath = call.getString("filePath");
        String target = call.getString("target", "BOTH");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }
        try {
            WallpaperHelper.applyWallpaper(getContext(), filePath, target);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject(t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName(), t instanceof Exception ? (Exception) t : null);
        }
    }

    @PluginMethod
    public void cycleNextWallpaper(PluginCall call) {
        String nextPath = WallpaperHelper.cycleToNextWallpaper(getContext());
        JSObject ret = new JSObject();
        ret.put("success", nextPath != null);
        if (nextPath != null) {
            ret.put("activeWallpaperPath", nextPath);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void syncState(PluginCall call) {
        JSArray wallpaperPaths = call.getArray("wallpaperPaths", new JSArray());
        JSArray schedules = call.getArray("schedules", new JSArray());
        String defaultTarget = call.getString("defaultTarget", "BOTH");

        prefs().edit()
            .putString(WallpaperHelper.KEY_WALLPAPERS, wallpaperPaths.toString())
            .putString(WallpaperHelper.KEY_SCHEDULES, schedules.toString())
            .putString(WallpaperHelper.KEY_DEFAULT_TARGET, defaultTarget)
            .apply();

        WallpaperHelper.rescheduleAllAlarms(getContext());

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("exactAlarm", WallpaperHelper.canScheduleExact(ctx));

        boolean battery = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            battery = pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        ret.put("batteryUnrestricted", battery);
        ret.put("currentIndex", prefs().getInt(WallpaperHelper.KEY_CURRENT_INDEX, -1));
        ret.put("baseDir", ctx.getFilesDir().getAbsolutePath());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarm(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !WallpaperHelper.canScheduleExact(getContext())) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            } catch (Exception e) {
                call.reject("Could not open the alarm permission screen");
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryUnrestricted(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        } catch (Exception e) {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            } catch (Exception e2) {
                call.reject("Could not open battery settings");
                return;
            }
        }
        call.resolve();
    }

    private static void writeBase64(File file, String base64) throws Exception {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
            out.flush();
        }
    }
}
