import os
from pydantic import BaseModel, validator
from typing import List, Optional, Union
from constant import CodeTypeEnum

class CodeBlock(BaseModel):

    code: str
    name: str
    prefix: str
    codeType: str
    numLines: int
    blockIndex: Union[int, float]

    @validator('codeType')
    def validate_codeType(cls, v):
        if v not in [item.value for item in CodeTypeEnum]:
            raise ValueError('codeType must in CodeTypeEnum')
        return v


class NodeData(BaseModel):

    name: str
    basicCodeBlocks: List[CodeBlock]
    dynamicCodeBlocks: List[CodeBlock]

class NodeMidInfo(BaseModel):

    type: str
    nodeData: NodeData

class Node(BaseModel):

    id: str
    type: str
    posX: Union[int, float]
    posY: Union[int, float]
    data: NodeData

class NodePos(BaseModel):
    x: Union[int, float]
    y: Union[int, float]

class Edge(BaseModel):
    id: str
    source_id: str
    source_act: str
    target_id: str

class RuntimeNode(BaseModel):

    file:str
    node:Node
 