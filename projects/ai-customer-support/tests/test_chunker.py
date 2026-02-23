"""Tests for the document chunking service."""
from __future__ import annotations

import pytest

from app.services.chunker import Chunk, chunk_html, chunk_markdown, chunk_text


class TestChunkText:
    """Tests for plain text chunking."""

    def test_empty_text_returns_empty(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_single_chunk(self):
        text = "This is a short sentence."
        chunks = chunk_text(text, chunk_size=100, overlap=10)
        assert len(chunks) == 1
        assert chunks[0].content == text
        assert chunks[0].index == 0
        assert chunks[0].token_count > 0

    def test_text_splits_into_multiple_chunks(self, sample_text: str):
        chunks = chunk_text(sample_text, chunk_size=30, overlap=5)
        assert len(chunks) > 1
        # Verify all chunks have content
        for chunk in chunks:
            assert chunk.content.strip() != ""
            assert chunk.token_count > 0

    def test_chunk_indices_are_sequential(self, sample_text: str):
        chunks = chunk_text(sample_text, chunk_size=30, overlap=5)
        for i, chunk in enumerate(chunks):
            assert chunk.index == i

    def test_chunk_sizes_respect_limit(self, sample_text: str):
        chunk_size = 50
        chunks = chunk_text(sample_text, chunk_size=chunk_size, overlap=10)
        for chunk in chunks:
            # Allow small overshoot due to sentence boundaries
            assert chunk.token_count <= chunk_size * 1.5

    def test_overlap_produces_shared_content(self):
        # Create text with clear sentence boundaries
        sentences = [f"Sentence number {i} with some content." for i in range(20)]
        text = " ".join(sentences)
        chunks = chunk_text(text, chunk_size=30, overlap=10)

        if len(chunks) >= 2:
            # With overlap, later chunks should share some content with previous
            first_words = set(chunks[0].content.split())
            second_words = set(chunks[1].content.split())
            # There should be some word overlap
            assert len(first_words & second_words) > 0

    def test_no_overlap(self):
        sentences = [f"Sentence number {i} about a topic." for i in range(10)]
        text = " ".join(sentences)
        chunks_no_overlap = chunk_text(text, chunk_size=30, overlap=0)
        assert len(chunks_no_overlap) >= 1
        for chunk in chunks_no_overlap:
            assert chunk.content.strip() != ""


class TestChunkMarkdown:
    """Tests for markdown-aware chunking."""

    def test_empty_markdown_returns_empty(self):
        assert chunk_markdown("") == []

    def test_splits_on_headers(self, sample_markdown: str):
        chunks = chunk_markdown(sample_markdown, chunk_size=200, overlap=10)
        assert len(chunks) >= 1
        # Check that section metadata is preserved
        sections = [c.metadata.get("section") for c in chunks if c.metadata.get("section")]
        assert len(sections) > 0

    def test_preserves_code_blocks(self, sample_markdown: str):
        chunks = chunk_markdown(sample_markdown, chunk_size=500, overlap=10)
        # At least one chunk should contain code
        code_chunks = [c for c in chunks if "```" in c.content or "pip install" in c.content]
        assert len(code_chunks) > 0

    def test_large_sections_are_sub_chunked(self):
        # Create a section that exceeds chunk_size
        large_section = "# Big Section\n\n" + " ".join(
            [f"This is sentence {i} with enough words to make it large." for i in range(100)]
        )
        chunks = chunk_markdown(large_section, chunk_size=50, overlap=5)
        assert len(chunks) > 1

    def test_header_hierarchy_preserved(self):
        md = "# Title\n\nIntro.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B."
        chunks = chunk_markdown(md, chunk_size=500, overlap=0)
        assert len(chunks) >= 2  # At least title + sections


class TestChunkHtml:
    """Tests for HTML-aware chunking."""

    def test_empty_html_returns_empty(self):
        assert chunk_html("") == []

    def test_extracts_text_from_html(self, sample_html: str):
        chunks = chunk_html(sample_html, chunk_size=200, overlap=10)
        assert len(chunks) >= 1
        # Should not contain HTML tags
        for chunk in chunks:
            assert "<html>" not in chunk.content
            assert "<body>" not in chunk.content

    def test_removes_script_and_style(self):
        html = """
        <html>
        <head><style>body { color: red; }</style></head>
        <body>
            <script>alert('xss');</script>
            <p>Actual content here.</p>
        </body>
        </html>
        """
        chunks = chunk_html(html, chunk_size=500, overlap=0)
        for chunk in chunks:
            assert "alert" not in chunk.content
            assert "color: red" not in chunk.content
            assert "Actual content" in chunk.content

    def test_html_chunks_have_metadata(self, sample_html: str):
        chunks = chunk_html(sample_html, chunk_size=500, overlap=0)
        for chunk in chunks:
            assert chunk.metadata.get("source_type") == "html"

    def test_headers_converted_to_markdown(self, sample_html: str):
        chunks = chunk_html(sample_html, chunk_size=500, overlap=0)
        all_content = " ".join(c.content for c in chunks)
        # h1 should become #, h2 should become ##
        assert "#" in all_content

    def test_fallback_to_plain_text(self):
        """HTML with no block elements should fall back to plain text chunking."""
        html = "Just some plain text without any HTML structure at all."
        chunks = chunk_html(html, chunk_size=500, overlap=0)
        assert len(chunks) >= 1
        assert "plain text" in chunks[0].content
