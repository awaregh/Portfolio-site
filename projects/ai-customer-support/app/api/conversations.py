from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.models.conversation import Conversation, Message
from app.models.tenant import Tenant
from app.services.conversation_engine import ConversationEngine

router = APIRouter(prefix="/conversations", tags=["conversations"])
logger = get_logger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    external_id: str | None = None
    metadata: dict[str, Any] | None = None


class SendMessageRequest(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: dict | list | None = None
    confidence: float | None = None
    token_count: int
    created_at: str

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    external_id: str | None
    status: str
    summary: str | None
    message_count: int
    metadata: dict | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = []


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int
    page: int
    page_size: int


class AssistantResponse(BaseModel):
    message: MessageResponse
    sources: list[dict[str, Any]] = []
    confidence: float | None = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Create a new conversation."""
    conv = Conversation(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        external_id=body.external_id,
        status="active",
        metadata_=body.metadata or {},
    )
    db.add(conv)
    await db.flush()

    return ConversationResponse(
        id=str(conv.id),
        external_id=conv.external_id,
        status=conv.status,
        summary=conv.summary,
        message_count=conv.message_count,
        metadata=conv.metadata_,
        created_at=str(conv.created_at),
        updated_at=str(conv.updated_at),
    )


@router.post("/{conversation_id}/messages", response_model=AssistantResponse)
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Send a message and get an AI response (main RAG endpoint)."""
    # Verify conversation exists and belongs to tenant
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    if conv.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation is not active",
        )

    engine = ConversationEngine(db)
    response = await engine.process_message(
        conversation_id=uuid.UUID(conversation_id),
        user_message=body.content,
        tenant_id=tenant.id,
    )

    return AssistantResponse(
        message=MessageResponse(
            id=str(response["message"].id),
            role=response["message"].role,
            content=response["message"].content,
            sources=response["message"].sources,
            confidence=response["message"].confidence,
            token_count=response["message"].token_count,
            created_at=str(response["message"].created_at),
        ),
        sources=response.get("sources", []),
        confidence=response.get("confidence"),
    )


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """List conversations for the current tenant, paginated."""
    base_query = select(Conversation).where(Conversation.tenant_id == tenant.id)

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        base_query.order_by(Conversation.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    convs = result.scalars().all()

    return ConversationListResponse(
        items=[
            ConversationResponse(
                id=str(c.id),
                external_id=c.external_id,
                status=c.status,
                summary=c.summary,
                message_count=c.message_count,
                metadata=c.metadata_,
                created_at=str(c.created_at),
                updated_at=str(c.updated_at),
            )
            for c in convs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Get a conversation with its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    return ConversationDetailResponse(
        id=str(conv.id),
        external_id=conv.external_id,
        status=conv.status,
        summary=conv.summary,
        message_count=conv.message_count,
        metadata=conv.metadata_,
        created_at=str(conv.created_at),
        updated_at=str(conv.updated_at),
        messages=[
            MessageResponse(
                id=str(m.id),
                role=m.role,
                content=m.content,
                sources=m.sources,
                confidence=m.confidence,
                token_count=m.token_count,
                created_at=str(m.created_at),
            )
            for m in conv.messages
        ],
    )


@router.post("/{conversation_id}/close", response_model=ConversationResponse)
async def close_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Close a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    conv.status = "closed"
    await db.flush()

    return ConversationResponse(
        id=str(conv.id),
        external_id=conv.external_id,
        status=conv.status,
        summary=conv.summary,
        message_count=conv.message_count,
        metadata=conv.metadata_,
        created_at=str(conv.created_at),
        updated_at=str(conv.updated_at),
    )
