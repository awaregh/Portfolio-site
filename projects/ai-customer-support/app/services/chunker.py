from __future__ import annotations

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup

from app.services.embedding import count_tokens


@dataclass
class Chunk:
    """A single chunk of text with metadata."""
    content: str
    index: int
    token_count: int = 0
    metadata: dict = field(default_factory=dict)


def chunk_text(
    text: str,
    chunk_size: int = 512,
    overlap: int = 64,
) -> list[Chunk]:
    """Split text into overlapping chunks based on token count.

    Uses sentence boundaries where possible to avoid splitting mid-sentence.
    """
    if not text or not text.strip():
        return []

    sentences = _split_into_sentences(text)
    chunks: list[Chunk] = []
    current_tokens: list[str] = []
    current_count = 0
    chunk_index = 0

    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)

        # If a single sentence exceeds chunk_size, split it further
        if sentence_tokens > chunk_size:
            # Flush current buffer first
            if current_tokens:
                chunk_text_content = " ".join(current_tokens)
                chunks.append(Chunk(
                    content=chunk_text_content,
                    index=chunk_index,
                    token_count=count_tokens(chunk_text_content),
                ))
                chunk_index += 1
                # Keep overlap tokens
                current_tokens, current_count = _keep_overlap(current_tokens, overlap)

            # Force-split the long sentence by words
            words = sentence.split()
            for word in words:
                word_tokens = count_tokens(word)
                if current_count + word_tokens > chunk_size and current_tokens:
                    chunk_text_content = " ".join(current_tokens)
                    chunks.append(Chunk(
                        content=chunk_text_content,
                        index=chunk_index,
                        token_count=count_tokens(chunk_text_content),
                    ))
                    chunk_index += 1
                    current_tokens, current_count = _keep_overlap(current_tokens, overlap)
                current_tokens.append(word)
                current_count += word_tokens
            continue

        if current_count + sentence_tokens > chunk_size and current_tokens:
            chunk_text_content = " ".join(current_tokens)
            chunks.append(Chunk(
                content=chunk_text_content,
                index=chunk_index,
                token_count=count_tokens(chunk_text_content),
            ))
            chunk_index += 1
            current_tokens, current_count = _keep_overlap(current_tokens, overlap)

        current_tokens.append(sentence)
        current_count += sentence_tokens

    # Flush remaining tokens
    if current_tokens:
        chunk_text_content = " ".join(current_tokens)
        chunks.append(Chunk(
            content=chunk_text_content,
            index=chunk_index,
            token_count=count_tokens(chunk_text_content),
        ))

    return chunks


def chunk_markdown(text: str, chunk_size: int = 512, overlap: int = 64) -> list[Chunk]:
    """Markdown-aware chunking that respects headers and code blocks.

    Splits on headers (##) while keeping code blocks intact where possible.
    """
    if not text or not text.strip():
        return []

    sections = _split_markdown_sections(text)
    chunks: list[Chunk] = []
    chunk_index = 0

    for section_header, section_body in sections:
        section_text = f"{section_header}\n{section_body}".strip() if section_header else section_body.strip()
        section_token_count = count_tokens(section_text)

        if section_token_count <= chunk_size:
            if section_text:
                chunks.append(Chunk(
                    content=section_text,
                    index=chunk_index,
                    token_count=section_token_count,
                    metadata={"section": section_header.strip() if section_header else None},
                ))
                chunk_index += 1
        else:
            # Section too large — sub-chunk it
            sub_chunks = chunk_text(section_text, chunk_size, overlap)
            for sc in sub_chunks:
                sc.index = chunk_index
                sc.metadata["section"] = section_header.strip() if section_header else None
                chunks.append(sc)
                chunk_index += 1

    return chunks


def chunk_html(html: str, chunk_size: int = 512, overlap: int = 64) -> list[Chunk]:
    """HTML-aware chunking using BeautifulSoup.

    Extracts text by block-level elements and chunks accordingly.
    """
    if not html or not html.strip():
        return []

    soup = BeautifulSoup(html, "html.parser")

    # Remove script and style elements
    for tag in soup(["script", "style"]):
        tag.decompose()

    # Extract text blocks by block-level elements
    block_tags = {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "h5", "h6",
                  "blockquote", "pre", "td", "th"}
    blocks: list[str] = []

    for element in soup.find_all(block_tags):
        text = element.get_text(separator=" ", strip=True)
        if text:
            prefix = ""
            if element.name and element.name.startswith("h"):
                prefix = "#" * int(element.name[1]) + " "
            blocks.append(prefix + text)

    # If no block elements found, fall back to full text
    if not blocks:
        full_text = soup.get_text(separator="\n", strip=True)
        return chunk_text(full_text, chunk_size, overlap)

    combined = "\n\n".join(blocks)
    chunks = chunk_text(combined, chunk_size, overlap)

    # Tag chunks with source type
    for c in chunks:
        c.metadata["source_type"] = "html"

    return chunks


# ── Helpers ──────────────────────────────────────────────────────────────────

def _split_into_sentences(text: str) -> list[str]:
    """Split text into sentences using regex."""
    # Split on period/question/exclamation followed by space or end of string
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if p.strip()]


def _split_markdown_sections(text: str) -> list[tuple[str, str]]:
    """Split markdown text into (header, body) pairs."""
    lines = text.split("\n")
    sections: list[tuple[str, str]] = []
    current_header = ""
    current_body: list[str] = []

    for line in lines:
        if re.match(r'^#{1,6}\s', line):
            # Save previous section
            if current_body or current_header:
                sections.append((current_header, "\n".join(current_body)))
            current_header = line
            current_body = []
        else:
            current_body.append(line)

    # Don't forget the last section
    if current_body or current_header:
        sections.append((current_header, "\n".join(current_body)))

    return sections


def _keep_overlap(tokens: list[str], overlap: int) -> tuple[list[str], int]:
    """Keep the last `overlap` tokens worth of text for chunk overlap."""
    if overlap <= 0:
        return [], 0

    kept: list[str] = []
    kept_count = 0
    for token in reversed(tokens):
        tc = count_tokens(token)
        if kept_count + tc > overlap:
            break
        kept.insert(0, token)
        kept_count += tc

    return kept, kept_count
