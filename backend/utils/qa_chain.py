from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnableLambda, RunnablePassthrough


def format_docs(retrieved_docs):
    """Formats retrieved documents into a single string for the prompt context."""
    return "\n\n".join(doc.page_content for doc in retrieved_docs)


def create_qa_chain(retriever):
    """Creates a RAG QA chain using the provided retriever."""
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
    prompt = PromptTemplate(
        template="""
You are a helpful and intelligent AI assistant.
You are given a YouTube video transcript (may include Hindi; translate key parts to English if needed) and a question about it.

Your goal is to answer the question **using the transcript as the main source of truth.**
If part of the answer is not directly mentioned, you may logically infer it.
Only say "I don't know" if there is truly no relevant information.

Transcript:
{context}

Question: {question}

Now provide a clear, concise answer in 3–6 sentences (in English).
""",
        input_variables=["context", "question"]
    )

    parallel_chain = RunnableParallel(
        context=retriever | RunnableLambda(format_docs),
        question=RunnablePassthrough()
    )

    final_chain = parallel_chain | prompt | llm | StrOutputParser()
    return final_chain