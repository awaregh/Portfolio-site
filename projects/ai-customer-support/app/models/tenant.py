from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class Tenant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    api_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(
        Enum("free", "pro", "enterprise", name="tenant_plan"),
        default="free",
        server_default="free",
        nullable=False,
    )
    settings: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    # Relationships
    users: Mapped[list[User]] = relationship("User", back_populates="tenant", lazy="selectin")
    documents: Mapped[list[Document]] = relationship(
        "Document", back_populates="tenant", lazy="selectin"
    )
