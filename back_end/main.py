
import multiprocessing
import os
import uvicorn
import asyncio
import aiofiles
from typing import Union, List, Optional, Dict, Tuple
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from websocket_transport import WebSocketTransport, JsonRPCProtocol
from starlette.websockets import WebSocketState


from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from code_manager import parser_code_file, synthesize_code, parser_code, synthesize_code_file
from task_logic import task_logic
from data_model import CodeBlock, NodeData, Node, RuntimeNode, Edge
from project_manager import ProjectSingleton
from constant import ClassTypeEnum, CodeTypeEnum

from lsp_server import pyls


# global management
def get_proj_instance() -> ProjectSingleton:
    return  global_instance


async def periodic_save_to_disk():
    try:
        while True:
            global_instance.inner_save_proj()
            await asyncio.sleep(10)  # 10 sec
    except asyncio.CancelledError:
        print("Task was cancelled!")
        print("Task cleanup completed.")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时的逻辑
    print("Starting app...")
    asyncio.create_task(periodic_save_to_disk())
    yield
    # 关闭时的逻辑
    print("Shutting down app...")

app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许的来源（可以是单个或多个）
    allow_credentials=True,
    allow_methods=["*"],  # 允许的 HTTP 方法
    allow_headers=["*"],  # 允许的 HTTP 头部
)


# request modeling
# proj
class ProjDir(BaseModel):
    value: str

# node
class NodeAdd(BaseModel):
    nodeType:str

class NodeUpdateByCode(BaseModel):
    nodeId: str
    wholeNodeCode: str

class NodeRM(BaseModel):
    nodeId: str

class NodeLog(BaseModel):
    nodeId: str
    nodeAct: Optional[str]=None

class RunTask(BaseModel):
    nodeId: str
    nodeAct: str

# response
class TaskStatus(BaseModel):
    taskStatus: str
    curNode: Optional[str] = None
    curEdge: Optional[str] = None
    taskAlive: bool

# proj
class ProjInfo(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


class BasicResponse(BaseModel):
    code: int=0
    message: str="OK"
    data: Union[List[str], str, Node, TaskStatus, ProjInfo, None]=None


# @app.websocket("/ws/lsp")
# async def websocket_lsp_endpoint(websocket: WebSocket):
#     """
#     WebSocket
#     """
#     await websocket.accept()

#     # 使用 asyncio.StreamReader 和 StreamWriter 与 Pygls 通信
#     reader = asyncio.StreamReader()
#     writer = asyncio.StreamWriter(None, None, reader, asyncio.get_running_loop())


#     # 将 WebSocket 输入写入 reader
#     async def websocket_to_reader():
#         try:
#             while True:
#                 data = await websocket.receive_text()
#                 reader.feed_data(data.encode('utf-8'))
#         except WebSocketDisconnect:
#             reader.feed_eof()

#     # 将 writer 输出发送到 WebSocket
#     async def writer_to_websocket():
#         while not writer.transport.is_closing():
#             try:
#                 data = await reader.read(1024)
#                 if data:
#                     await websocket.send_text(data.decode('utf-8'))
#             except asyncio.CancelledError:
#                 break

#     async def start_lsp():
#         await pyls.start_io(reader, writer)

#     # 启动 LSP 服务器协程
#     lsp_task = asyncio.create_task(start_lsp())
#     reader_task = asyncio.create_task(websocket_to_reader())
#     writer_task = asyncio.create_task(writer_to_websocket())

#     try:
#         # 等待所有任务完成
#         await asyncio.gather(lsp_task, reader_task, writer_task)
#     except Exception as e:
#         print(f"Error in LSP WebSocket connection: {e}")
#     finally:
#         lsp_task.cancel()
#         reader_task.cancel()
#         writer_task.cancel()


@app.post("/add_one_node")
async def add_one_node(value: NodeAdd, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    
    if value.nodeType not in [item.value for item in ClassTypeEnum]:
        return BasicResponse(code=-1, message="undefined type")
    
    new_rt_node = proj_instance.add_node(value.nodeType, 0, 0)
    return BasicResponse(data=new_rt_node.node)


@app.post("/update_one_node")
async def update_one_node(value: Node, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")

    sucess, info = proj_instance.update_node(value)
    if not sucess:
        return BasicResponse(code=-1, message=info)
    return BasicResponse(data=info)


@app.post("/parser_node_by_code")
async def parser_node_by_code(value: NodeUpdateByCode, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")

    if value.nodeId not in proj_instance.nodes:
        return BasicResponse(code=-1, message="old ID is not in Nodes")
    rt_node: RuntimeNode = proj_instance.nodes[value.nodeId]
    try: 
        # parser code
        # print("parser_code node id", value.nodeId)
        # print("parser_code", value.wholeNodeCode)
        sucess, node_mid_info = parser_code(value.wholeNodeCode)
        if not sucess:
            return BasicResponse(code=-1, message="node format error")
        update_node = Node(id=value.nodeId, type=node_mid_info.type, posX=rt_node.node.posX,
                       posY=rt_node.node.posY, data=node_mid_info.nodeData)
        # print("parser_code get Node", update_node)
    except:
        return BasicResponse(code=-1, message="ast paered error! please check your code")
    
    return BasicResponse(data=update_node)


@app.post("/delete_one_node")
async def delete_one_node(value: NodeRM, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    if value.nodeId not in proj_instance.nodes:
        return BasicResponse(code=-1, message="old ID is not in Nodes")
    
    proj_instance.delete_node(value.nodeId)
    return BasicResponse()


@app.post("/add_one_edge")
async def add_one_edge(value: Edge, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    proj_instance.add_edge(value)
    print(proj_instance.edges)
    return BasicResponse()


@app.post("/delete_one_edge")
async def delete_one_edge(value: Edge, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    proj_instance.delete_edge(value)
    return BasicResponse()


@app.get("/get_proj_dir")
async def get_proj_dir(proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    return BasicResponse(data=proj_instance.get_dir())


@app.post("/set_proj_dir")
async def set_proj_dir(value: ProjDir, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    proj_instance.set_dir(value.value)
    # return formated info
    return BasicResponse()


@app.get("/read_the_proj")
async def read_the_proj(proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    rt_nodes, rt_edges = proj_instance.nodes, proj_instance.edges
    proj_info = ProjInfo(nodes=[v.node for v in rt_nodes.values()], edges=[Edge(id=f"xy-edge__{k[0]}{k[1]}-{v}input", source_id=k[0], source_act=k[1], target_id=v) for k, v in rt_edges.items()])
    # return formated info
    return BasicResponse(data=proj_info)


@app.get("/save_the_proj")
async def save_the_proj(proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    print("save_proj")
    sucess, info = proj_instance.save_proj()
    if not sucess:
        return BasicResponse(code=-1, message=info)
    return BasicResponse()


@app.post("/run_the_proj")
async def run_the_proj(value: RunTask, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is running task")
    sucess, info = proj_instance.save_proj()
    if not sucess:
        return BasicResponse(code=-1, message=info)

    # prepare task
    proj_dir = proj_instance.get_dir()
    log_list, log_dict, running_status, current_task, stop_event, log_file = proj_instance.handle_project_start()
    rt_nodes, rt_edges = proj_instance.nodes, proj_instance.edges
    max_loop = proj_instance.get_max_loop()
    # start process
    process = multiprocessing.Process(target=task_logic, args=[proj_dir, log_list, log_dict, stop_event, log_file, running_status, 
                    current_task, max_loop, rt_nodes, rt_edges, value.nodeId, value.nodeAct])

    process.start()
    return BasicResponse()


@app.get("/task_status")
async def task_status(proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    status = proj_instance.running_status.value
    cur_node = proj_instance.current_task['current_node']
    cur_act = proj_instance.current_task['current_act']
    cur_edge = None
    if cur_node and cur_act:
        target_id = proj_instance.edges[(cur_node, cur_act)]
        cur_edge = f"xy-edge__{cur_node}{cur_act}-{target_id}input"
    cur_process = proj_instance.get_cur_process()
    task_alive = True if proj_instance.current_task['task_name'] else False
    if cur_process:
        if not cur_process.is_alive():
            task_alive = False
    return BasicResponse(data=TaskStatus(taskStatus=status, taskAlive=task_alive, curNode=cur_node, curEdge=cur_edge))


# get log
@app.post("/task_log")
async def task_log(value: NodeLog, proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if value.nodeAct:
        key = (value.nodeId, value.nodeAct)
    else:
        key = value.nodeId
    span_list = proj_instance.log_dict.get(key, [])
    logs = []
    for start, end in span_list:
        logs.append("\n".join(proj_instance.log_list[start:end]))
    return BasicResponse(data=logs)


# stop run
@app.post("/stop_run")
async def stop_task(proj_instance: ProjectSingleton = Depends(get_proj_instance)):
    if not proj_instance.locked_proj():
        BasicResponse(code=-1, message="there is no running task")
    
    process = proj_instance.get_cur_process()
    if process.is_alive():
        proj_instance.stop_event.set() # stop smoothly
        process.join(timeout=5)
        if process.is_alive():
            process.terminate()  # stop sharply
        proj_instance.handle_project_stop(if_interrupt=True)

    return BasicResponse()


if __name__=="__main__":
    global_instance = ProjectSingleton()
    uvicorn.run(app, host="localhost", port=5000)