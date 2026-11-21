
import uuid

import chromadb
from sentence_transformers import SentenceTransformer

from app.config import CHROMA_PATH


client = chromadb.PersistentClient(
    path=str(CHROMA_PATH)
)

collection = client.get_or_create_collection(
    name="document_chunks",
    metadata={"hnsw:space": "cosine"}
)

_embedding_model = None


def get_embedding_model():

    global _embedding_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _embedding_model


def store_chunks(
    document_id: str,
    filename: str,
    chunks: list[dict]
):

    model = get_embedding_model()

    texts = [chunk["text"] for chunk in chunks]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True
    ).tolist()

    ids = [str(uuid.uuid4()) for _ in texts]

    metadatas = [
        {
            "document_id": document_id,
            "filename": filename,
            "page_number": chunk["page_number"]
        }
        for chunk in chunks
    ]

    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas
    )

    return len(texts)


def search_chunks(question: str, top_k: int = 4):

    total = collection.count()

    if total == 0:
        return []

    model = get_embedding_model()

    query_embedding = model.encode(
        [question],
        normalize_embeddings=True
    ).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, total)
    )

    matches = []

    for i, text in enumerate(results["documents"][0]):

        metadata = results["metadatas"][0][i]

        matches.append({
            "text": text,
            "filename": metadata["filename"],
            "page_number": metadata["page_number"],
            "distance": results["distances"][0][i]
        })

    return matches
    
def list_documents():
    records = collection.get(include=["metadatas"])

    documents = {}

    for metadata in records["metadatas"]:
        document_id = metadata["document_id"]

        if document_id not in documents:
            documents[document_id] = {
                "document_id": document_id,
                "filename": metadata["filename"],
                "chunks_count": 0
            }

        documents[document_id]["chunks_count"] += 1

    return list(documents.values())


def delete_document(document_id: str):
    results = collection.get(
        where={"document_id": document_id},
        include=["metadatas"]
    )

    if not results["ids"]:
        return False

    collection.delete(ids=results["ids"])

    return True
