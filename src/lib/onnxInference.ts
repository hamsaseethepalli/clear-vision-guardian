import * as ort from "onnxruntime-web";

// Configure WASM: use CDN, single thread, no SIMD to maximize compatibility
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";

// ImageNet normalization constants
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const INPUT_SIZE = 224;

const GRADE_DATA = {
  0: {
    gradeLabel: "No Diabetic Retinopathy",
    riskLevel: "Low",
    explanation: "No signs of diabetic retinopathy detected. The retinal vasculature appears normal with no microaneurysms, hemorrhages, or exudates.",
    recommendations: ["Continue regular annual eye examinations", "Maintain blood sugar control", "Monitor HbA1c levels"],
  },
  1: {
    gradeLabel: "Mild NPDR",
    riskLevel: "Low-Moderate",
    explanation: "Mild non-proliferative diabetic retinopathy detected. A few microaneurysms are present in the retinal vasculature.",
    recommendations: ["Schedule follow-up in 9-12 months", "Optimize glycemic control", "Monitor blood pressure"],
  },
  2: {
    gradeLabel: "Moderate NPDR",
    riskLevel: "Moderate",
    explanation: "Moderate non-proliferative diabetic retinopathy detected. Multiple microaneurysms, dot-blot hemorrhages, and hard exudates observed.",
    recommendations: ["Refer to ophthalmologist within 3-6 months", "Strict blood sugar management", "Consider lipid-lowering therapy"],
  },
  3: {
    gradeLabel: "Severe NPDR",
    riskLevel: "High",
    explanation: "Severe non-proliferative diabetic retinopathy detected. Extensive hemorrhages, venous beading, and intraretinal microvascular abnormalities present.",
    recommendations: ["Urgent ophthalmology referral within 2-4 weeks", "Consider panretinal photocoagulation", "Intensive metabolic management"],
  },
  4: {
    gradeLabel: "Proliferative DR",
    riskLevel: "Critical",
    explanation: "Proliferative diabetic retinopathy detected. Neovascularization and/or vitreous/preretinal hemorrhage identified. Immediate treatment required.",
    recommendations: ["Emergency ophthalmology referral", "Panretinal photocoagulation or anti-VEGF therapy", "Consider vitrectomy if vitreous hemorrhage present"],
  },
} as const;

export interface ONNXResult {
  grade: 0 | 1 | 2 | 3 | 4;
  confidence: number;
  gradeLabel: string;
  riskLevel: string;
  explanation: string;
  recommendations: string[];
  probabilities: number[];
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;

// Cache model in IndexedDB for instant reloads
async function getCachedModel(): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("models", "readonly");
      const store = tx.objectStore("models");
      const req = store.get("retinopathy");
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheModel(data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("models", "readwrite");
    const store = tx.objectStore("models");
    store.put({ id: "retinopathy", data });
  } catch {
    // Cache failure is non-critical
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("retino-ai-models", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("models", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSession(): Promise<ort.InferenceSession> {
  // Try cached model first
  let modelBuffer = await getCachedModel();

  // Validate cached model - ONNX files start with magic bytes \x08
  if (modelBuffer && modelBuffer.byteLength < 1000) {
    console.warn("Cached ONNX model appears corrupted, re-fetching...");
    modelBuffer = null;
    // Clear bad cache
    try {
      const db = await openDB();
      const tx = db.transaction("models", "readwrite");
      tx.objectStore("models").delete("retinopathy");
    } catch { /* ignore */ }
  }

  if (!modelBuffer) {
    const response = await fetch("/models/retinopathy.onnx");
    if (!response.ok) throw new Error(`Failed to load ONNX model: ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    // If Vite serves it as HTML (e.g. SPA fallback), the model is invalid
    if (contentType.includes("text/html")) {
      throw new Error("ONNX model served as HTML - file may be missing from public/models/");
    }
    modelBuffer = await response.arrayBuffer();
    if (modelBuffer.byteLength < 10000) {
      throw new Error(`ONNX model too small (${modelBuffer.byteLength} bytes) - likely corrupted`);
    }
    await cacheModel(modelBuffer);
  }

  const session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  return session;
}

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = loadSession().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

/**
 * Preprocess an image file to a tensor for the ONNX model.
 * - Resize to 224x224
 * - Normalize with ImageNet mean/std
 * - Output shape: [1, 3, 224, 224] (NCHW)
 */
async function preprocessImage(file: File): Promise<ort.Tensor> {
  const bitmap = await createImageBitmap(file);

  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imageData;

  // Create Float32Array in NCHW format
  const float32Data = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  const pixelCount = INPUT_SIZE * INPUT_SIZE;

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    // ImageNet normalization + NCHW layout
    float32Data[i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];              // R channel
    float32Data[pixelCount + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];  // G channel
    float32Data[2 * pixelCount + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2]; // B channel
  }

  return new ort.Tensor("float32", float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

/**
 * Apply softmax to convert logits to probabilities
 */
function softmax(logits: Float32Array): number[] {
  const maxLogit = Math.max(...logits);
  const exps = Array.from(logits).map((l) => Math.exp(l - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Run inference on a retinal image using the ONNX model.
 */
export async function analyzeRetinalImage(file: File): Promise<ONNXResult> {
  const session = await getSession();
  const inputTensor = await preprocessImage(file);

  // Get the input name from the model
  const inputName = session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

  const results = await session.run(feeds);
  const outputName = session.outputNames[0];
  const outputData = results[outputName].data as Float32Array;

  // Apply softmax to get probabilities
  const probabilities = softmax(outputData);

  // Get predicted grade (argmax)
  let maxProb = 0;
  let grade = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      grade = i;
    }
  }

  const gradeKey = Math.min(grade, 4) as 0 | 1 | 2 | 3 | 4;
  const gradeInfo = GRADE_DATA[gradeKey];

  return {
    grade: gradeKey,
    confidence: Math.round(maxProb * 1000) / 1000,
    gradeLabel: gradeInfo.gradeLabel,
    riskLevel: gradeInfo.riskLevel,
    explanation: gradeInfo.explanation,
    recommendations: [...gradeInfo.recommendations],
    probabilities,
  };
}

/**
 * Preload the model in the background for faster first inference.
 */
export function preloadModel(): void {
  getSession().catch(() => {
    // Silent fail — will retry on first analysis
  });
}

/**
 * Check if the model is available and loaded.
 */
export async function isModelReady(): Promise<boolean> {
  try {
    await getSession();
    return true;
  } catch {
    return false;
  }
}
