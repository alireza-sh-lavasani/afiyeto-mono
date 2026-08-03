package org.afiyet.mobile;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AfiyetMainActivity";
    private static final String DB_NAME = "afiyet_med_knowledge.db";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LlamaPlugin.class);
        registerPlugin(SqliteVecPlugin.class);
        super.onCreate(savedInstanceState);

        // Auto-provision medical vector database from APK assets on boot
        copyPrebuiltDatabaseIfNecessary();
    }

    private void copyPrebuiltDatabaseIfNecessary() {
        new Thread(() -> {
            try {
                File dbDir = new File(getFilesDir().getParentFile(), "databases");
                if (!dbDir.exists()) {
                    dbDir.mkdirs();
                }

                File dbFile = new File(dbDir, DB_NAME);

                // If DB does not exist, copy from APK assets
                if (!dbFile.exists() || dbFile.length() == 0) {
                    Log.i(TAG, "Unpacking prebuilt vector database from assets: " + DB_NAME);
                    try (InputStream is = getAssets().open("databases/" + DB_NAME);
                         OutputStream os = new FileOutputStream(dbFile)) {

                        byte[] buffer = new byte[8192];
                        int length;
                        while ((length = is.read(buffer)) > 0) {
                            os.write(buffer, 0, length);
                        }
                        os.flush();
                        Log.i(TAG, "Successfully extracted vector database to: " + dbFile.getAbsolutePath());
                    } catch (Exception assetEx) {
                        Log.w(TAG, "No prebuilt database found in assets/databases/" + DB_NAME + " or failed copy: " + assetEx.getMessage());
                    }
                } else {
                    Log.i(TAG, "Vector database already present at: " + dbFile.getAbsolutePath());
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking/copying database: " + e.getMessage());
            }
        }).start();
    }
}
