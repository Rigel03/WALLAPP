package com.wallapp.app;

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
            tile.setState(Tile.STATE_ACTIVE);
            tile.setLabel("Next Wallpaper");
            tile.updateTile();
        }
    }

    @Override
    public void onClick() {
        super.onClick();
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setState(Tile.STATE_UNAVAILABLE);
            tile.updateTile();
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            String nextPath = WallpaperHelper.cycleToNextWallpaper(getApplicationContext());

            new Handler(Looper.getMainLooper()).post(() -> {
                Tile updatedTile = getQsTile();
                if (updatedTile != null) {
                    updatedTile.setState(Tile.STATE_ACTIVE);
                    updatedTile.updateTile();
                }

                if (nextPath != null) {
                    Toast.makeText(
                        getApplicationContext(),
                        "Wallpaper cycled!",
                        Toast.LENGTH_SHORT
                    ).show();
                } else {
                    Toast.makeText(
                        getApplicationContext(),
                        "Add wallpapers in WallSync first",
                        Toast.LENGTH_SHORT
                    ).show();
                }
            });
        });
    }
}
