import os
import uuid
import json
import pandas as pd
from typing import List, Dict, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

# Import our workflow logic
from src.agents.ticket_crew import TicketInput, ClassificationResult, classify_ticket, classify_batch

app = FastAPI(title="Ticket Agent API", description="AI-powered ticket classification backend")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job storage (In production, use Redis or a DB)
JOBS: Dict[str, Dict] = {}

# Paths
TEMP_DIR = Path("data/output/temp_jobs")
DB_FILE = Path("data/output/classifications_db.json")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def load_db() -> List[ClassificationResult]:
    if not DB_FILE.exists():
        return []
    try:
        with open(DB_FILE, "r") as f:
            data = json.load(f)
            return [ClassificationResult(**item) for item in data]
    except:
        return []

def save_to_db(result: ClassificationResult):
    db = load_db()
    db.insert(0, result) # Newest first
    # Keep last 100
    db = db[:100]
    with open(DB_FILE, "w") as f:
        json.dump([res.dict() for res in db], f, indent=2)

class JobStatus(BaseModel):
    job_id: str
    status: str
    total: int
    processed: int
    results: List[ClassificationResult] = []

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Ticket Agent API is running"}

@app.post("/classify", response_model=ClassificationResult)
def classify_single(ticket: TicketInput):
    """Classify a single ticket synchronously."""
    try:
        result = classify_ticket(ticket)
        save_to_db(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets", response_model=List[ClassificationResult])
def get_all_tickets():
    """Retrieve all classified tickets from the 'database'."""
    return load_db()

@app.post("/classify/batch")
def classify_batch_endpoint(tickets: List[TicketInput], background_tasks: BackgroundTasks):
    """Classify multiple tickets in the background."""
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "status": "processing",
        "total": len(tickets),
        "processed": 0,
        "results": []
    }
    
    background_tasks.add_task(run_batch_job, job_id, tickets)
    return {"job_id": job_id, "message": "Batch processing started"}

@app.post("/classify/upload")
async def classify_upload_endpoint(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Classify tickets from an uploaded Excel file."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    # Save file and read tickets
    contents = await file.read()
    df = pd.read_excel(contents)
    
    # Map Excel columns to TicketInput
    # Normalizing columns based on expected names
    col_map = {
        "Numéro": "numero", 
        "Brève description": "breve_description", 
        "Description": "description",
        "Entreprise": "entreprise"
    }
    df = df.rename(columns=col_map)
    
    tickets = []
    for _, row in df.iterrows():
        tickets.append(TicketInput(
            numero=str(row.get("numero", "INC_UNK")),
            breve_description=str(row.get("breve_description", "")),
            description=str(row.get("description", "")),
            entreprise=str(row.get("entreprise", ""))
        ))
    
    job_id = f"upload_{uuid.uuid4().hex[:8]}"
    JOBS[job_id] = {
        "status": "processing",
        "total": len(tickets),
        "processed": 0,
        "results": []
    }
    
    background_tasks.add_task(run_batch_job, job_id, tickets)
    return {"job_id": job_id, "message": "File upload successful, processing started"}

@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Retrieve job progress and results."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS[job_id]

@app.get("/jobs/{job_id}/download")
def download_job_results(job_id: str):
    """Download job results as an Excel file."""
    if job_id not in JOBS or JOBS[job_id]["status"] != "done":
        raise HTTPException(status_code=400, detail="Job not finished or not found")
    
    results = JOBS[job_id]["results"]
    df = pd.DataFrame([res.dict() for res in results])
    
    output_path = TEMP_DIR / f"results_{job_id}.xlsx"
    df.to_excel(output_path, index=False, sheet_name="Classifications")
    
    return FileResponse(path=output_path, filename=f"ticket_results_{job_id}.xlsx")

@app.patch("/jobs/{job_id}/correct")
def correct_job_result(job_id: str, correction: Dict):
    """Manually correct a result (Mock implementation)."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # In a real app, update the persistent storage here
    return {"status": "success", "message": f"Ticket {correction.get('numero')} corrected in job {job_id}"}

# --- Helper Functions ---

def run_batch_job(job_id: str, tickets: List[TicketInput]):
    """Background task to process tickets one by one to track progress."""
    results = []
    for ticket in tickets:
        try:
            result = classify_ticket(ticket)
            save_to_db(result)
            results.append(result)
        except Exception as e:
            # Fallback error result
            results.append(ClassificationResult(
                numero=ticket.numero,
                categorie="Error",
                sous_categorie="Processing",
                service="N/A",
                impact="N/A",
                urgence="N/A",
                priorite_calculee="N/A",
                confidence=0.0,
                reasoning=f"Internal Error: {str(e)}"
            ))
        
        JOBS[job_id]["processed"] += 1
        JOBS[job_id]["results"] = results
    
    JOBS[job_id]["status"] = "done"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
