"""Notes CRUD routes — /api/notes"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, desc

from app.models.database import Note, get_session_factory
from app.models.schemas import NoteCreate, NoteUpdate, NoteResponse
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
async def list_notes(user: dict = Depends(get_current_user)):
    """Return all notes for the authenticated user, newest first."""
    user_id = user.get("sub", "")
    factory = get_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(Note).where(Note.user_id == user_id).order_by(desc(Note.updated_at))
        )
        notes = result.scalars().all()
    return [
        NoteResponse(
            id=n.id,
            text=n.text,
            created_at=n.created_at.isoformat() if n.created_at else "",
            updated_at=n.updated_at.isoformat() if n.updated_at else "",
        )
        for n in notes
    ]


@router.post("", status_code=201)
async def create_note(body: NoteCreate, user: dict = Depends(get_current_user)):
    """Create a new note for the authenticated user."""
    user_id = user.get("sub", "")
    note = Note(id=str(uuid.uuid4()), user_id=user_id, text=body.text.strip())
    factory = get_session_factory()
    async with factory() as db:
        db.add(note)
        await db.commit()
        await db.refresh(note)
    return NoteResponse(
        id=note.id,
        text=note.text,
        created_at=note.created_at.isoformat() if note.created_at else "",
        updated_at=note.updated_at.isoformat() if note.updated_at else "",
    )


@router.patch("/{note_id}")
async def update_note(note_id: str, body: NoteUpdate, user: dict = Depends(get_current_user)):
    """Update the text of an existing note."""
    user_id = user.get("sub", "")
    factory = get_session_factory()
    async with factory() as db:
        note = await db.get(Note, note_id)
        if not note or note.user_id != user_id:
            raise HTTPException(status_code=404, detail="Note not found")
        note.text = body.text.strip()
        note.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(note)
    return NoteResponse(
        id=note.id,
        text=note.text,
        created_at=note.created_at.isoformat() if note.created_at else "",
        updated_at=note.updated_at.isoformat() if note.updated_at else "",
    )


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
    """Delete a note. Returns 404 if it doesn't belong to the user."""
    user_id = user.get("sub", "")
    factory = get_session_factory()
    async with factory() as db:
        note = await db.get(Note, note_id)
        if not note or note.user_id != user_id:
            raise HTTPException(status_code=404, detail="Note not found")
        await db.delete(note)
        await db.commit()
