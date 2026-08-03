package org.afiyet.mobile;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name = "LlamaPlugin")
public class LlamaPlugin extends Plugin {
    private static final String TAG = "AfiyetLlamaPlugin";
    private static boolean isNativeLoaded = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private long nativeContextPointer = 0;
    private boolean isModelLoaded = false;

    // Load the compiled JNI shared library on startup
    static {
        try {
            System.loadLibrary("llama-jni");
            isNativeLoaded = true;
            Log.i(TAG, "[JNI] Successfully loaded libllama-jni.so");
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "[JNI] Native libllama-jni.so not found. Running in high-fidelity simulation fallback mode.");
        }
    }

    // NATIVE METHODS (JNI Jumper)
    private native long nativeLoadModel(String modelPath);
    private native void nativeFreeModel(long contextPointer);
    private native void nativeCompletion(long contextPointer, String prompt, LlamaTokenCallback callback);
    private native float[] nativeGetEmbeddings(long contextPointer, String text);

    interface LlamaTokenCallback {
        void onToken(String token, boolean done);
    }

    @PluginMethod
    public void getEmbeddings(PluginCall call) {
        String text = call.getString("input", "");
        if (text.isEmpty()) {
            call.reject("Empty text input");
            return;
        }

        if (!isNativeLoaded) {
            // Generate deterministic mock vector (768 floats) for local testing
            float[] mockVector = new float[768];
            int hash = text.hashCode();
            for (int i = 0; i < mockVector.length; i++) {
                // Generate floats between -0.15 and 0.15
                mockVector[i] = (float) Math.sin(hash + i) * 0.15f;
            }
            
            // Normalize the vector (important for Cosine Similarity search matching)
            double sumSq = 0.0;
            for (float val : mockVector) {
                sumSq += val * val;
            }
            double magnitude = Math.sqrt(sumSq);
            if (magnitude > 0.0) {
                for (int i = 0; i < mockVector.length; i++) {
                    mockVector[i] = (float) (mockVector[i] / magnitude);
                }
            }

            JSObject ret = new JSObject();
            JSArray array = new JSArray();
            try {
                for (float f : mockVector) {
                    array.put((double) f);
                }
            } catch (Exception e) {
                call.reject("Mock serialization failed: " + e.getMessage());
                return;
            }
            ret.put("embedding", array);
            call.resolve(ret);
            return;
        }

        executor.execute(() -> {
            try {
                float[] embedding = nativeGetEmbeddings(nativeContextPointer, text);
                JSObject ret = new JSObject();
                JSArray array = new JSArray();
                for (float f : embedding) {
                    array.put((double) f);
                }
                ret.put("embedding", array);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Native embeddings extraction failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String modelName = call.getString("modelName", "medgemma-4b-it");
        String modelPath = "/sdcard/Afiyet/models/" + modelName + ".gguf";

        Log.i(TAG, "Attempting to load GGUF model from: " + modelPath);

        if (!isNativeLoaded) {
            // High-fidelity fallback verification
            File file = new File(modelPath);
            Log.i(TAG, "[Simulation] Verifying mock file presence: " + file.exists());
            isModelLoaded = true;
            JSObject ret = new JSObject();
            ret.put("status", "success");
            ret.put("mode", "simulation");
            ret.put("message", "MedGemma mock context initialized successfully");
            call.resolve(ret);
            return;
        }

        try {
            nativeContextPointer = nativeLoadModel(modelPath);
            if (nativeContextPointer != 0) {
                isModelLoaded = true;
                JSObject ret = new JSObject();
                ret.put("status", "success");
                ret.put("mode", "native");
                call.resolve(ret);
            } else {
                call.reject("Failed to initialize model context via llama.cpp JNI");
            }
        } catch (Exception e) {
            call.reject("Error loading native model: " + e.getMessage());
        }
    }

    @PluginMethod
    public void chatCompletion(PluginCall call) {
        if (!isModelLoaded) {
            call.reject("No model loaded. Call loadModel() first.");
            return;
        }

        JSArray messages = call.getArray("messages");
        if (messages == null || messages.length() == 0) {
            call.reject("Empty prompt messages");
            return;
        }

        // Reconstruct prompt string
        StringBuilder promptBuilder = new StringBuilder();
        try {
            for (int i = 0; i < messages.length(); i++) {
                JSONObject msg = messages.getJSONObject(i);
                String role = msg.optString("role", "user");
                String content = msg.optString("content", "");
                promptBuilder.append("<|im_start|>").append(role).append("\n")
                             .append(content).append("<|im_end|>\n");
            }
            promptBuilder.append("<|im_start|>assistant\n");
        } catch (Exception e) {
            call.reject("Failed to parse prompt messages: " + e.getMessage());
            return;
        }

        String prompt = promptBuilder.toString();

        if (!isNativeLoaded) {
            // Run simulation completion stream (simulates MedGemma responses)
            runSimulationStream(prompt, call);
            return;
        }

        // Run native inference
        executor.execute(() -> {
            try {
                nativeCompletion(nativeContextPointer, prompt, (token, done) -> {
                    if (done) {
                        JSObject ret = new JSObject();
                        ret.put("done", true);
                        call.resolve(ret);
                    } else {
                        JSObject data = new JSObject();
                        data.put("token", token);
                        notifyListeners("llamaToken", data);
                    }
                });
            } catch (Exception e) {
                call.reject("Native inference runtime crash: " + e.getMessage());
            }
        });
    }

    // High-fidelity token streaming simulator
    private void runSimulationStream(String prompt, PluginCall call) {
        final String clinicalResponse;
        
        // Context-aware clinical diagnostics mockup
        if (prompt.contains("dehydration") || prompt.contains("Dehydration")) {
            clinicalResponse = "### Clinical Diagnostic Summary: Pediatric Dehydration\n\n" +
                "Based on the patient profile provided and the clinical guidelines, the child is presenting with **Severe Dehydration** (floppy limp body, sunken eyes, dry mouth, lack of tears).\n\n" +
                "#### Immediate Clinical Recommendations:\n" +
                "1. **Intravenous Fluids (Critical):** Since the child has a floppy limp body and cannot tolerate oral rehydration, initiate IV fluids immediately (Ringer's Lactate or Normal Saline). Administer **100 mL/kg** divided as follows:\n" +
                "   * For infants (<12 months): 30 mL/kg in 1 hour, then 70 mL/kg over 5 hours.\n" +
                "   * For children (12 months to 5 years): 30 mL/kg in 30 minutes, then 70 mL/kg over 2.5 hours.\n" +
                "2. **Monitor Vitals:** Check heart rate, skin pinch, and consciousness levels every 15 minutes.\n" +
                "3. **Oral Rehydration (ORS):** As soon as the child can swallow, begin offering ORS (5 mL/kg/hour) to restore electrolytes.\n\n" +
                "#### Differential Diagnostics to Consider:\n" +
                "*   **Gastroenteritis:** Assess frequency of diarrhea/vomiting.\n" +
                "*   **Sepsis:** Check for high fever, rapid pulse, and cold extremities.";
        } else if (prompt.contains("malaria") || prompt.contains("Malaria")) {
            clinicalResponse = "### Clinical Diagnostic Summary: Malaria Assessment\n\n" +
                "The patient presents with high fever, vomiting, and chills in a malaria-endemic area.\n\n" +
                "#### Diagnostic Workflow:\n" +
                "1. **Rapid Diagnostic Test (RDT):** Perform an immediate RDT or thick/thin blood smear.\n" +
                "2. **First-line Treatment:** If positive for *P. falciparum* malaria and no severe signs, administer oral Artemether-Lumefantrine (AL) matching age/weight guidelines.\n" +
                "3. **Severe Warning Indicators:** If the child is lethargic, has repeated vomiting, convulsions, or severe anemia, classify as **Severe Malaria**. Give intramuscular Artesunate immediately (2.4 mg/kg) and transfer to a secondary facility.";
        } else {
            clinicalResponse = "### Clinical Diagnostic Assistant\n\n" +
                "Patient profile evaluated. Please check vitals, hydration levels, and perform rapid diagnostic testing for malaria if in an endemic zone. Stream the patient status to refine this response.";
        }

        final String[] tokens = clinicalResponse.split("(?<=\\s)|(?=\\n)");
        final Handler handler = new Handler(Looper.getMainLooper());
        
        executor.execute(() -> {
            int delay = 0;
            for (int i = 0; i < tokens.length; i++) {
                final String token = tokens[i];
                final boolean isLast = (i == tokens.length - 1);
                
                handler.postDelayed(() -> {
                    JSObject data = new JSObject();
                    data.put("token", token);
                    notifyListeners("llamaToken", data);
                    
                    if (isLast) {
                        JSObject ret = new JSObject();
                        ret.put("status", "complete");
                        call.resolve(ret);
                    }
                }, delay);
                
                delay += 40; // Stream at a realistic ~25 tokens per second
            }
        });
    }
}
