
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.rag_service import answer_question


router = APIRouter(
    prefix="/api/v1/questions",
    tags=["Questions"]
)


class QuestionRequest(BaseModel):

    question: str = Field(
        min_length=3,
        max_length=1000
    )


@router.post("/ask")
def ask_question(request: QuestionRequest):

    try:
        result = answer_question(request.question)

        return {
            "question": request.question,
            "answer": result["answer"],
            "sources": result["sources"]
        }

    except Exception as error:
        print(f"Question answering error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Unable to generate an answer. Check the LLM service."
        )
