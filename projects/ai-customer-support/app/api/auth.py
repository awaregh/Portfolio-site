from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    tenant_name: str
    tenant_slug: str
    email: EmailStr
    password: str
    name: str


class RegisterResponse(BaseModel):
    tenant_id: str
    user_id: str
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    role: str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new tenant and admin user."""
    # Check for existing slug
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.tenant_slug))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant slug '{body.tenant_slug}' already exists",
        )

    # Check for existing email
    existing_user = await db.execute(select(User).where(User.email == body.email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Create tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        name=body.tenant_name,
        slug=body.tenant_slug,
        api_key=secrets.token_urlsafe(32),
        plan="free",
        settings={},
    )
    db.add(tenant)
    await db.flush()

    # Create admin user
    user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=get_password_hash(body.password),
        name=body.name,
        role="admin",
        tenant_id=tenant.id,
    )
    db.add(user)
    await db.flush()

    # Generate JWT
    token = create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": str(tenant.id),
            "role": user.role,
            "email": user.email,
        }
    )

    return RegisterResponse(
        tenant_id=str(tenant.id),
        user_id=str(user.id),
        access_token=token,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role,
            "email": user.email,
        }
    )

    return LoginResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
    )
