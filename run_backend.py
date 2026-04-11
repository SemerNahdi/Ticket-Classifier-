import uvicorn
import os
import sys

# Ensure the root directory is in sys.path so 'src' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Starting Ticket Agent Backend...")
    print("📍 API Docs: http://localhost:8000/docs")
    print("📍 Health Check: http://localhost:8000/health")
    
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=True)
