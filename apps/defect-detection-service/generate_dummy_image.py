from PIL import Image
import numpy as np

# Create a dummy image (e.g., a gray square representing a billet)
img_array = np.full((224, 224, 3), 128, dtype=np.uint8)
img = Image.fromarray(img_array)
img.save("dummy_billet.jpg")
print("Dummy image saved as dummy_billet.jpg")
