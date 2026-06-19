"""File upload and text extraction endpoint."""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.file_processor import extract_text, SUPPORTED_EXTENSIONS
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Upload a file and extract its text content.

    Supports .txt, .md, .pdf, .docx files up to 5MB.
    Returns the extracted text (truncated at 4000 chars), filename, and char count.
    """
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max size is 5MB.")

    try:
        text = extract_text(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("File extraction error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to extract text from file.")

    logger.info(
        "File uploaded by user %s: %s (%d chars extracted)",
        user.get("sub"),
        file.filename,
        len(text),
    )
    return {"text": text, "filename": file.filename, "chars": len(text)}
