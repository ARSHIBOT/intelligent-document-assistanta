
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface Document {
  document_id: string;
  filename: string;
  chunks_count: number;
}

export interface Source {
  filename: string;
  page_number: number;
}

export interface AnswerResponse {
  question: string;
  answer: string;
  sources: Source[];
}

// Upload PDF documents
export async function uploadDocuments(files: File[]) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

// Retrieve uploaded documents
export async function getDocuments(): Promise<Document[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/`
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const data = await response.json();
  return data.documents;
}

// Delete a document
export async function deleteDocument(documentId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/${documentId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

// Ask a question about uploaded documents
export async function askQuestion(
  question: string
): Promise<AnswerResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/questions/ask`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
