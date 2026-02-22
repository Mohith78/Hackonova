from fastapi import FastAPI, UploadFile, File
from PIL import Image
import numpy as np
import io
import json
from pathlib import Path
from tensorflow.keras.models import load_model



app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "garbage_model.h5"
CLASS_PATH = BASE_DIR / "models" / "class_names.json"

model = load_model(MODEL_PATH, compile=False)


if CLASS_PATH.exists():
    with open(CLASS_PATH, "r", encoding="utf-8") as f:
        class_names = json.load(f)
else:
    # Fallback labels if class_names.json is not available.
    class_names = ["class_0", "class_1", "class_2", "class_3"]

# Change this to match the image size used during model training.
IMG_SIZE = (224, 224)


@app.get("/")
def health():
    return {"status": "ok", "message": "ML backend running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    content = await file.read()
    image = Image.open(io.BytesIO(content)).convert("RGB")
    image = image.resize(IMG_SIZE)

    arr = np.array(image, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)  # (1, H, W, 3)

    preds = model.predict(arr, verbose=0)[0]
    idx = int(np.argmax(preds))
    confidence = float(preds[idx])

    label = class_names[idx] if idx < len(class_names) else f"class_{idx}"
    return {"prediction": label, "confidence": confidence}
