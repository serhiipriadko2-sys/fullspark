from fastapi import FastAPI, Query
from pydantic import BaseModel
from pathlib import Path
import re

app = FastAPI(title="Iskra API", version="1.0.0")

def tokenize(s: str): return re.findall(r"[a-zA-Zа-яА-Я0-9_]+", s.lower())

class Citation(BaseModel):
    source: str
    snippet: str

class SearchResponse(BaseModel):
    query: str
    citations: list[Citation]
    delta: dict

def search_files(q: str, root: Path, limit=5):
    qtok = set(tokenize(q)); hits=[]
    for p in root.iterdir():
        if p.suffix.lower() in {'.md','.txt'} and p.is_file():
            txt = p.read_text(encoding='utf-8', errors='ignore')
            toks=set(tokenize(txt)); score=len(qtok & toks)
            if score>0: hits.append((score, p.name, txt[:240].replace('\n',' ')))
    hits.sort(key=lambda x: x[0], reverse=True)
    return [{'source':h[1],'snippet':h[2]} for h in hits[:limit]]

@app.post('/v1/search', response_model=SearchResponse)
def v1_search(q: str = Query(...), root: str = Query('/mnt/data')):
    citations = search_files(q, Path(root))
    return {'query': q, 'citations': citations, 'delta': {'∆':'search','Ω':'med','Λ':'none'}}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    message: str
    citations: list[Citation]
    delta: dict

@app.post('/v1/chat', response_model=ChatResponse)
def v1_chat(req: ChatRequest, root: str = Query('/mnt/data')):
    citations = search_files(req.message, Path(root))
    return {'message': 'Скелет ответа', 'citations': citations, 'delta': {'∆':'chat','Ω':'med','Λ':'none'}}
