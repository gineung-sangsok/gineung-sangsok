"""기능상속 백엔드.

실행: uv run uvicorn backend.main:app --reload
문서: http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import store
from .schemas import (
    Closure,
    ClosureCreate,
    ClosureFunctions,
    Entity,
    ErrorResponse,
    FunctionsUpdate,
    Gap,
    Inheritance,
    ResourceType,
    Village,
)

app = FastAPI(title="기능상속 API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
closures = store.ClosureStore()
ERRORS = {404: {"model": ErrorResponse}}


def error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
    code, message = exc.detail if isinstance(exc.detail, tuple) else ("HTTP_ERROR", exc.detail)
    return error(exc.status_code, code, message)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return error(422, "VALIDATION_ERROR", str(exc.errors()))


def get_closure(closure_id: str) -> Closure:
    closure = closures.get(closure_id)
    if closure is None:
        raise HTTPException(404, ("CLOSURE_NOT_FOUND", f"{closure_id}를 찾을 수 없습니다."))
    return closure


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/closures", response_model=Closure, status_code=201, responses=ERRORS, tags=["① 등록"])
def create_closure(body: ClosureCreate) -> Closure:
    found = store.stores_by_id().get(body.store_id)
    if found is None:
        raise HTTPException(404, ("STORE_NOT_FOUND", f"{body.store_id}를 찾을 수 없습니다."))
    return closures.create(found, body.closure_date, body.note)


@app.get(
    "/closures/{closure_id}/functions",
    response_model=ClosureFunctions,
    responses=ERRORS,
    tags=["② 기능 분리"],
)
def get_functions(closure_id: str) -> ClosureFunctions:
    get_closure(closure_id)
    return closures.get_functions(closure_id)


@app.patch(
    "/closures/{closure_id}/functions",
    response_model=ClosureFunctions,
    responses=ERRORS,
    tags=["③ 확인·수정"],
)
def update_functions(closure_id: str, body: FunctionsUpdate) -> ClosureFunctions:
    get_closure(closure_id)
    return closures.update_functions(closure_id, body.functions)


@app.get(
    "/closures/{closure_id}/inheritance",
    response_model=Inheritance,
    responses=ERRORS,
    tags=["④ 상속안"],
)
def get_inheritance(closure_id: str) -> Inheritance:
    get_closure(closure_id)
    return closures.inheritance(closure_id)


@app.get("/closures/{closure_id}/gap", response_model=Gap, responses=ERRORS, tags=["⑤ 공백 변화"])
def get_gap(closure_id: str) -> Gap:
    get_closure(closure_id)
    return closures.gap(closure_id)


@app.get("/resources", response_model=list[Entity], tags=["지도"])
def list_resources(resource_type: ResourceType | None = None) -> list[Entity]:
    items = store.resources()
    if resource_type:
        items = [item for item in items if item.resource_type == resource_type]
    return items


@app.get("/villages", response_model=list[Village], tags=["지도"])
def list_villages() -> list[Village]:
    return store.villages()
