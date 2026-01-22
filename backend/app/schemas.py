from pydantic import BaseModel

class AnalysisResult(BaseModel):
    rows: int
    columns: list
    summary: dict


class UserCreate(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
