package com.wallapp.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WallpaperPlugin")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        String filePath = call.getString("filePath");
        String target = call.getString("target", "BOTH");

        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }

        boolean ok = WallpaperHelper.applyWallpaperFromPath(getContext(), filePath, target);
        JSObject ret = new JSObject();
        ret.put("success", ok);
        if (!ok) {
            ret.put("message", "Failed to apply wallpaper from path: " + filePath);
        }
        call.resolve(ret);
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

        SharedPreferences prefs = getContext().getSharedPreferences(
            WallpaperHelper.PREFS_NAME,
            Context.MODE_PRIVATE
        );

        prefs.edit()
            .putString(WallpaperHelper.KEY_WALLPAPERS, wallpaperPaths.toString())
            .putString(WallpaperHelper.KEY_SCHEDULES, schedules.toString())
            .putString(WallpaperHelper.KEY_DEFAULT_TARGET, defaultTarget)
            .apply();

        WallpaperHelper.rescheduleAllAlarms(getContext());

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
