"""
Standard API Response Envelopes and Error Handlers.
Adheres to docs/API_SPECIFICATION.md conventions.
"""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

DataT = TypeVar("DataT")


class Meta(BaseModel):
    request_id: Optional[str] = None
    timestamp: Optional[str] = None


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    issue: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class ErrorResponse(BaseModel):
    error: ErrorBody
    meta: Optional[Meta] = None


class SuccessResponse(BaseModel, Generic[DataT]):
    data: DataT
    meta: Optional[Meta] = None
