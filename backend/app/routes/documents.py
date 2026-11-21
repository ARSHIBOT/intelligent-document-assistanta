
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.pdf_service import process_pdf
from app.services.vector_service import (
    store_chunks,
    list_documents,
    delete_document
)


router = APIRouter(
    prefix="/api/v1/documents",
    tags=["Documents"]
)

MAX_FILE_SIZE = 20 * 1024 * 1024


@router.post("/upload")
async def upload_documents(
    files: list[UploadFile] = File(...)
):

    results = []

    for file in files:

        filename = file.filename or "unknown.pdf"

        if Path(filename).suffix.lower() != ".pdf":
            raise HTTPException(
                status_code=400,
                detail=f"{filename} is not a PDF."
            )

        content = await file.read()

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"{filename} exceeds 20 MB."
            )

        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail=f"{filename} is not a valid PDF."
            )

        try:
            chunks = process_pdf(content)

            document_id = str(uuid.uuid4())

            total_chunks = store_chunks(
                document_id,
                filename,
                chunks
            )

            results.append({
                "document_id": document_id,
                "filename": filename,
                "chunks_created": total_chunks,
                "pages_processed": len(
                    set(c["page_number"] for c in chunks)
                )
            })

        except ValueError as error:
            raise HTTPException(
                status_code=400,
                detail=str(error)
            )

        except Exception as error:
            print(f"Document processing error: {error}")

            raise HTTPException(
                status_code=500,
                detail="Document processing failed."
            )

    return {
        "message": "Documents uploaded and indexed.",
        "documents": results
    }
    
@router.get("/")
def get_documents():
    return {
        "documents": list_documents()
    }

@router.delete("/{document_id}")
def remove_document(document_id: str):
    deleted = delete_document(document_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    return {
        "message": "Document deleted successfully.",
        "document_id": document_id
    }

