package org.afiyet.mobile;

import android.content.res.AssetManager;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "SqliteVecPlugin")
public class SqliteVecPlugin extends Plugin {
    private static final String TAG = "AfiyetSqliteVecPlugin";
    private static boolean isNativeLoaded = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private boolean isDbInitialized = false;

    static {
        try {
            // Attempt to load native sqlite-vec extension
            System.loadLibrary("sqlite-vec");
            isNativeLoaded = true;
            Log.i(TAG, "[JNI] Successfully loaded native libsqlite-vec.so");
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "[JNI] Native sqlite-vec not found. Falling back to high-performance Java vector comparison.");
        }
    }

    // Native JNI functions (for loading C-based sqlite extension)
    private native void nativeInitDb(String dbPath);
    private native String nativeQuerySimilarity(float[] queryVector, int limit);

    @PluginMethod
    public void initDb(PluginCall call) {
        String dbPath = call.getString("dbPath", "/sdcard/Afiyet/knowledge-base.db");
        Log.i(TAG, "Initializing Vector Database. Path: " + dbPath + " | Native loaded: " + isNativeLoaded);

        if (!isNativeLoaded) {
            // Fallback mode: Mark DB as initialized
            isDbInitialized = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "in-memory-json");
            call.resolve(ret);
            return;
        }

        try {
            nativeInitDb(dbPath);
            isDbInitialized = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "native");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to initialize native SQLite DB: " + e.getMessage());
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

        // Convert JSArray to float[]
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
            // High-performance Java Cosine Similarity Engine (runs over assets/knowledge-base.json)
            runJavaVectorQuery(queryVector, limit, call);
            return;
        }

        // Native sqlite-vec query execution
        executor.execute(() -> {
            try {
                String resultJson = nativeQuerySimilarity(queryVector, limit);
                JSArray hits = new JSArray(resultJson);
                JSObject ret = new JSObject();
                ret.put("hits", hits);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Native query error: " + e.getMessage());
            }
        });
    }

    // Java-based Cosine Similarity RAG engine
    private void runJavaVectorQuery(float[] queryVector, int limit, PluginCall call) {
        executor.execute(() -> {
            try {
                // 1. Read the pre-compiled knowledge-base.json from PWA assets in APK
                AssetManager assetManager = getContext().getAssets();
                InputStream is = assetManager.open("public/assets/knowledge-base.json");
                
                int size = is.available();
                byte[] buffer = new byte[size];
                is.read(buffer);
                is.close();
                
                String jsonContent = new String(buffer, StandardCharsets.UTF_8);
                JSONObject root = new JSONObject(jsonContent);
                
                // Retrieve data
                JSONObject dataObj = root.optJSONObject("data");
                if (dataObj == null) {
                    call.reject("Invalid schema structure inside compiled JSON database");
                    return;
                }
                
                JSONObject docs = dataObj.optJSONObject("docs");
                if (docs == null) {
                    call.reject("Missing documents store in compiled JSON database");
                    return;
                }

                List<VectorHit> hits = new ArrayList<>();
                JSONArray docIds = docs.names();
                if (docIds != null) {
                    for (int i = 0; i < docIds.length(); i++) {
                        String id = docIds.getString(i);
                        JSONObject doc = docs.getJSONObject(id);
                        
                        // Parse embedding
                        JSONArray embArray = doc.optJSONArray("embedding");
                        if (embArray == null || embArray.length() == 0) continue;
                        
                        float[] docVector = new float[embArray.length()];
                        for (int j = 0; j < embArray.length(); j++) {
                            docVector[j] = (float) embArray.getDouble(j);
                        }
                        
                        // Calculate similarity
                        double similarity = calculateCosineSimilarity(queryVector, docVector);
                        
                        VectorHit hit = new VectorHit();
                        hit.id = id;
                        hit.score = similarity;
                        hit.title = doc.optString("title", "");
                        hit.category = doc.optString("category", "");
                        hit.content = doc.optString("content", "");
                        hits.add(hit);
                    }
                }

                // 2. Sort by score in descending order
                Collections.sort(hits, (h1, h2) -> Double.compare(h2.score, h1.score));

                // 3. Package Top K results
                JSArray hitsJS = new JSArray();
                int itemsToReturn = Math.min(limit, hits.size());
                for (int i = 0; i < itemsToReturn; i++) {
                    VectorHit hit = hits.get(i);
                    JSObject hitObj = new JSObject();
                    hitObj.put("id", hit.id);
                    hitObj.put("score", hit.score);
                    
                    JSObject docObj = new JSObject();
                    docObj.put("title", hit.title);
                    docObj.put("category", hit.category);
                    docObj.put("content", hit.content);
                    
                    hitObj.put("document", docObj);
                    hitsJS.put(hitObj);
                }

                JSObject result = new JSObject();
                result.put("hits", hitsJS);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Java vector processing error: " + e.getMessage());
            }
        });
    }

    private double calculateCosineSimilarity(float[] vectorA, float[] vectorB) {
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        int len = Math.min(vectorA.length, vectorB.length);
        
        for (int i = 0; i < len; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private static class VectorHit {
        String id;
        double score;
        String title;
        String category;
        String content;
    }
}
