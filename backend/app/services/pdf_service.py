
import fitz

from langchain_text_splitters import RecursiveCharacterTextSplitter


splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def process_pdf(file_bytes: bytes) -> list[dict]:

    pdf = fitz.open(
        stream=file_bytes,
        filetype="pdf"
    )

    try:
        if pdf.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported.")

        all_chunks = []

        for page_number, page in enumerate(pdf, start=1):

            text = page.get_text("text").strip()

            if not text:
                continue

            chunks = splitter.split_text(text)

            for chunk in chunks:
                all_chunks.append({
                    "text": chunk,
                    "page_number": page_number
                })

        if not all_chunks:
            raise ValueError(
                "No readable text found. The PDF may be scanned."
            )

        return all_chunks

    finally:
        pdf.close()
