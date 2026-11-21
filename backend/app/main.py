from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.routes.documents import router as documents_router
from app.routes.questions import router as questions_router

# Create the FastAPI application
app = FastAPI(
    title="Intelligent Document Research Assistant",
    description="An AI-powered application for researching PDF documents.",
    version="1.0.0",
)
app.include_router(documents_router)
app.include_router(questions_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request data validation
class QuestionRequest(BaseModel):
    question: str = Field(
        min_length=3,
        max_length=1000,
        description="Question asked about uploaded documents",
    )


# Response structure
class QuestionResponse(BaseModel):
    message: str
    question: str
    status: str


@app.get("/")
def home():
    return {
        "message": "Welcome to Intelligent Document Research Assistant",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Intelligent Document Research Assistant",
    }


@app.post("/api/v1/questions/preview", response_model=QuestionResponse)
def preview_question(request: QuestionRequest):
    return QuestionResponse(
        message="Your question was received successfully.",
        question=request.question,
        status="received",
    )

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    # Fix Swagger UI file-upload compatibility
    def fix_file_schema(node):
        if isinstance(node, dict):
            if node.get("contentMediaType") == "application/octet-stream":
                node.pop("contentMediaType", None)
                node["format"] = "binary"

            for value in node.values():
                fix_file_schema(value)

        elif isinstance(node, list):
            for item in node:
                fix_file_schema(item)

    fix_file_schema(schema)

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi
