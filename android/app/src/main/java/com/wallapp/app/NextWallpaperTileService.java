package com.wallapp.app;

import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.widget.Toast;

import androidx.annotation.RequiresApi;

import java.util.concurrent.Executors;

@RequiresApi(api = Build.VERSION_CODES.N)
public class NextWallpaperTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setIcon(Icon.createWithResource(this, R.drawable.ic_tile));
            tile.setLabel("Next Wallpaper");
            tile.setState(Tile.STATE_INACTIVE);
            tile.updateTile();
        }
    }

    @Override
    public void onClick() {
        super.onClick();
        final android.content.Context app = getApplicationContext();

        Executors.newSingleThreadExecutor().execute(() -> {
            String nextPath = WallpaperHelper.cycleToNextWallpaper(app);

            new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(
                app,
                nextPath != null ? "Wallpaper changed" : "Add wallpapers in WallApp first",
                Toast.LENGTH_SHORT
            ).show());
        });
    }
}
