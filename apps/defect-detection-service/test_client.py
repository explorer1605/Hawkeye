import requests
import sys

def test_inference(image_path: str):
    url = "http://127.0.0.1:8000/inspect"
    
    with open(image_path, "rb") as f:
        files = {"file": (image_path, f, "image/jpeg")}
        print(f"Sending {image_path} to {url}...")
        try:
            response = requests.post(url, files=files)
            response.raise_for_status()
            print("Response:", response.json())
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_client.py <path_to_image>")
        sys.exit(1)
    
    test_inference(sys.argv[1])
