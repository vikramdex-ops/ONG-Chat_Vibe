from typing import List


def simple_chunker(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[str]:
    """
    Exact word-based chunker matching SQA-O&G specification.
    Accumulates words until character length exceeds chunk_size,
    then retains trailing words up to chunk_overlap length for next chunk.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    current_chunk = []
    current_len = 0

    for word in words:
        word_len = len(word)
        addition = word_len + (1 if current_len > 0 else 0)
        
        if current_len == 0 or current_len + addition <= chunk_size:
            current_chunk.append(word)
            current_len += addition
        else:
            chunks.append(" ".join(current_chunk))
            overlap_word_count = 0
            if chunk_overlap > 0 and current_chunk:
                temp_overlap_len = 0
                for i in range(len(current_chunk) - 1, -1, -1):
                    w_len = len(current_chunk[i]) + 1
                    if temp_overlap_len + w_len <= chunk_overlap:
                        temp_overlap_len += w_len
                        overlap_word_count += 1
                    else:
                        break
            overlap_words = current_chunk[-overlap_word_count:] if overlap_word_count > 0 else []
            current_chunk = overlap_words + [word]
            current_len = len(" ".join(current_chunk))

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks
