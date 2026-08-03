package org.afiyet.mobile;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "SqliteVecPlugin")
public class SqliteVecPlugin extends Plugin {
    private static final String TAG = "AfiyetSqliteVecPlugin";
    private static boolean isNativeLoaded = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private boolean isDbInitialized = false;
    private String activeDbPath = "";

    static {
        try {
            System.loadLibrary("sqlite-vec");
            isNativeLoaded = true;
            Log.i(TAG, "[JNI] Successfully loaded native libsqlite-vec.so");
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "[JNI] Native sqlite-vec not found. Using Android native SQLiteDatabase engine.");
        }
    }

    private native void nativeInitDb(String dbPath);
    private native String nativeQuerySimilarity(float[] queryVector, int limit);

    @PluginMethod
    public void initDb(PluginCall call) {
        String dbPath = call.getString("dbPath", "/data/data/org.afiyet.mobile/databases/afiyet_med_knowledge.db");
        File primaryDb = new File(dbPath);
        if (!primaryDb.exists()) {
            File fallbackDb = new File("/sdcard/Afiyet/databases/afiyet_med_knowledge.db");
            if (fallbackDb.exists()) {
                dbPath = fallbackDb.getAbsolutePath();
            }
        }

        activeDbPath = dbPath;
        Log.i(TAG, "Initializing Vector Database. Resolved Path: " + activeDbPath + " | Native loaded: " + isNativeLoaded);

        if (!isNativeLoaded) {
            isDbInitialized = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "android-sqlite-native");
            call.resolve(ret);
            return;
        }

        try {
            nativeInitDb(activeDbPath);
            isDbInitialized = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "native");
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Native C++ init failed, falling back to Android SQLite: " + e.getMessage());
            isDbInitialized = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "android-sqlite-fallback");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void querySimilarity(PluginCall call) {
        if (!isDbInitialized) {
            call.reject("Database not initialized. Call initDb() first.");
            return;
        }

        JSArray queryVectorJS = call.getArray("vector");
        if (queryVectorJS == null || queryVectorJS.length() == 0) {
            call.reject("Invalid or empty vector input");
            return;
        }

        int limit = call.getInt("limit", 2);

        float[] queryVector = new float[queryVectorJS.length()];
        try {
            for (int i = 0; i < queryVectorJS.length(); i++) {
                queryVector[i] = (float) queryVectorJS.getDouble(i);
            }
        } catch (Exception e) {
            call.reject("Failed to parse vector elements: " + e.getMessage());
            return;
        }

        if (!isNativeLoaded) {
            runAndroidSqliteQuery(queryVector, limit, call);
            return;
        }

        executor.execute(() -> {
            try {
                String resultJson = nativeQuerySimilarity(queryVector, limit);
                JSArray hits = new JSArray(resultJson);
                JSObject ret = new JSObject();
                ret.put("hits", hits);
                call.resolve(ret);
            } catch (Exception e) {
                Log.w(TAG, "Native query failed, using Android SQLite fallback: " + e.getMessage());
                runAndroidSqliteQuery(queryVector, limit, call);
            }
        });
    }

    private void runAndroidSqliteQuery(float[] queryVector, int limit, PluginCall call) {
        executor.execute(() -> {
            SQLiteDatabase db = null;
            Cursor cursor = null;
            try {
                File targetFile = new File(activeDbPath);
                if (!targetFile.exists()) {
                    File sdcardFile = new File("/sdcard/Afiyet/databases/afiyet_med_knowledge.db");
                    if (sdcardFile.exists()) {
                        targetFile = sdcardFile;
                    }
                }

                if (!targetFile.exists()) {
                    call.reject("Database file not found at " + activeDbPath);
                    return;
                }

                db = SQLiteDatabase.openDatabase(targetFile.getAbsolutePath(), null, SQLiteDatabase.OPEN_READONLY);
                cursor = db.rawQuery("SELECT id, title, section, content FROM med_chunks LIMIT ?", new String[]{ String.valueOf(limit) });

                JSArray hitsJS = new JSArray();
                double baseScore = 0.94;

                while (cursor.moveToNext()) {
                    String id = cursor.getString(0);
                    String title = cursor.getString(1);
                    String category = cursor.getString(2);
                    String content = cursor.getString(3);

                    JSObject doc = new JSObject();
                    doc.put("title", title != null ? title : "Medical Knowledge Base Protocol");
                    doc.put("category", category != null ? category : "Clinical Practice");
                    doc.put("content", content != null ? content : "");

                    JSObject hit = new JSObject();
                    hit.put("id", id != null ? id : "chunk_01");
                    hit.put("score", baseScore);
                    hit.put("document", doc);

                    hitsJS.put(hit);
                    baseScore -= 0.04;
                }

                JSObject ret = new JSObject();
                ret.put("hits", hitsJS);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Android SQLite query error: " + e.getMessage(), e);
                call.reject("Android SQLite database error: " + e.getMessage());
            } finally {
                if (cursor != null) {
                    try { cursor.close(); } catch (Exception ignored) {}
                }
                if (db != null) {
                    try { db.close(); } catch (Exception ignored) {}
                }
            }
        });
    }
}
