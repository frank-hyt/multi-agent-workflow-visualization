import multiprocessing
import threading
import os
import uuid
import json
from datetime import datetime
from collections import defaultdict
from typing import List, Optional, Union

from code_manager import parser_code_file, synthesize_code_file
from data_model import Node, RuntimeNode, Edge, NodePos
from constant import ClassTypeEnum

class ProjectSingleton:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ProjectSingleton, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self.manager = multiprocessing.Manager()
        # proj
        # load proj dir
        self.dir = "./default_proj/"
        # load his proj dir
        if os.path.exists("./his_proj_dir"):
            with open("./his_proj_dir", 'r') as fr:
                his_dir = fr.read().strip()
                if his_dir:
                    self.dir = his_dir
        # backend runtime data
        self.nodes, self.edges = self.load_proj(self.dir)
        self.node_template = self.load_node_template()
        self.modify_dict = {}
        # task running info
        self.processe = None
        self.stop_event = multiprocessing.Event()
        self.running_status = self.manager.Value('u', "ready") 
        self.current_task = self.manager.dict({"task_name": None, "current_node": None, "current_act": None})  
        self.max_loop = 20
        # logging info
        self.log_list = self.manager.list()
        self.log_dict = self.manager.dict()
        self.log_file = None
        # lock
        self.lock = threading.Lock()

    def load_node_template(self,):
        node_template = {}
        for item in ClassTypeEnum:
            code_file = f'./node_template/{item.value}.py'
            sucess, runtime_node = parser_code_file(code_file)
            if sucess:
                node_template[item.value] = runtime_node
            else:
                print("init node template error!!")
        return node_template

    def add_node(self, type_name: str, x: int, y: int):
        # gen_a_uni_code
        for _ in range(10):
            full_uuid = uuid.uuid4()
            short_uuid = str(full_uuid).replace("-", "")[:6]
            new_node_id = f'node_{short_uuid}'
            if new_node_id not in self.nodes:
                break
        nodes_dir = os.path.join(self.dir, 'nodes/')
        with self.lock:
            if not os.path.exists(nodes_dir):
                os.mkdir(nodes_dir)
            code_file = os.path.join(nodes_dir, f'{new_node_id}.py')
            self.modify_dict[new_node_id] = "add"
            rt_node_template: RuntimeNode = self.node_template[type_name]
            new_rt_node =  RuntimeNode(file=code_file, node=Node(id=new_node_id, type=type_name, posX=x, 
                                                                 posY=y, data=rt_node_template.node.data))
            self.nodes[new_node_id] = new_rt_node
            return new_rt_node

    def update_node(self, update_node: Node):
        if update_node.id not in self.nodes:
            return False, "node id not in runtime nodes"
        old_rt_node = self.nodes[update_node.id]
        if update_node.id != old_rt_node.node.id:
            return False, "node id not consistent with rt_node"
        with self.lock:
            self.modify_dict[update_node.id] = "update"
            new_rt_node = RuntimeNode(file=old_rt_node.file, node=update_node)
            self.nodes[update_node.id] = new_rt_node
            # edge for act update
            act_set = set([act_item.name for act_item in update_node.data.dynamicCodeBlocks])
            for k in list(self.edges.keys()):
                if k[0] == update_node.id and k[1] not in act_set:
                    self.edges.pop(k)
            # pop all k related to removed action
            return True, "OK"

    def delete_node(self, node_id: str):
        with self.lock:
            self.modify_dict[node_id] = "delete"
            if node_id in self.nodes:
                self.nodes.pop(node_id)
                for k in self.edges.keys():
                    if k[0] == node_id:
                        self.edges.pop(k)
            return True, "OK"

    def add_edge(self, new_edge: Edge):
        with self.lock:
            self.edges[(new_edge.source_id, new_edge.source_act)] = new_edge.target_id
            return True, "OK"

    def delete_edge(self, edge: Edge):
        with self.lock:
            k = (edge.source_id, edge.source_act)
            if k in self.edges:
                self.edges.pop(k)
            return True, "OK"

    # proj managing
    def get_dir(self):
        with self.lock:
            return self.dir
        
    def load_proj(self, proj_dir: str):
        # edges
        edges_file = os.path.join(proj_dir, 'node_edges.json')
        edges_mid_data = json.load(open(edges_file, 'r')) if os.path.exists(edges_file) else []
        proj_edges =  {}
        for item in edges_mid_data:
            edge_instance = Edge.model_validate(item) 
            proj_edges[(edge_instance.source_id, edge_instance.source_act)] = edge_instance.target_id
        # print("load proj_edges", proj_edges, edges_mid_data)
        # nodes
        # pos
        node_pos_file = os.path.join(proj_dir, 'node_positions.json')
        nodes_pos = json.load(open(node_pos_file, 'r')) if os.path.exists(node_pos_file) else {}
        # init
        proj_nodes = {}
        nodes_dir = os.path.join(proj_dir, 'nodes')
        if os.path.exists(nodes_dir):
            for root, dirs, files in os.walk(nodes_dir):
                for file in files:
                    # if .py file
                    if file.endswith('.py'):
                        node_id = file.replace(".py", "")
                        file_path = os.path.join(root, file)
                        the_node_pos = NodePos(x=0, y=0)
                        if node_id in nodes_pos:
                            the_node_pos = NodePos.model_validate(nodes_pos[node_id])
                        correct, rt_node = parser_code_file(file_path, the_node_pos)
                        if correct:
                            proj_nodes[node_id] = rt_node

        return proj_nodes, proj_edges

    def save_proj(self):
        succes, info = self.inner_save_proj()
        if not succes:
            return succes, info
        return True, "OK"
    

    def set_dir(self, new_value: str):
        if self.dir == new_value:
            return True, "no modify"
        with self.lock:
            self.dir = new_value
            self.nodes, self.edges = self.load_proj(self.dir)
            return True, "ok"

    def refresh_proj(self):
        with self.lock:
            self.nodes, self.edges = self.load_proj(self.dir)

    def locked_proj(self):
        with self.lock:
            if self.current_task['task_name'] is None:
                return False
            return True
        
    def inner_save_proj(self,):
        with self.lock:
            oprate = list(self.modify_dict.items())
            # print("commit events:", oprate)
            for node_id, change in oprate:
                target_code_file = os.path.join(self.dir, f'nodes/{node_id}.py')
                if change == "delete":
                    if os.path.exists(target_code_file):
                        os.remove(target_code_file)
                    self.modify_dict.pop(node_id)
                if change in ["add", "update"]:
                    if node_id in self.nodes:
                        rt_node: RuntimeNode = self.nodes[node_id]
                        synthesize_code_file(rt_node.node, target_code_file) 
                    self.modify_dict.pop(node_id)
            node_pos = {}
            for node_id in self.nodes:
                rt_node: RuntimeNode = self.nodes[node_id]
                node_pos[node_id] = NodePos(x=rt_node.node.posX, y=rt_node.node.posY).model_dump()
            node_pos_file = os.path.join(self.dir, 'node_positions.json')
            json.dump(node_pos, open(node_pos_file, "w"))
            # save edge
            edges_file = os.path.join(self.dir, 'node_edges.json')
            save_edges = [Edge(id=f"xy-edge__{k[0]}{k[1]}-{v}input", source_id=k[0], source_act=k[1], target_id=v).model_dump() for k, v in self.edges.items()]
            json.dump(save_edges, open(edges_file, "w"))

            return True, "OK"
    
    # task running
    def set_max_loop(self, new_max: int):
        with self.lock:
            self.max_loop = new_max

    def get_max_loop(self):
        with self.lock:
            return self.max_loop
        
    def handle_project_start(self):
        with self.lock:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            task_name = f"task_{timestamp}"
            self.log_list[:] = []
            self.log_dict.clear()
            self.running_status.value = "ready"
            self.current_task.update({"task_name": task_name, "current_node": None, "current_act": None})
            self.stop_event.clear()
            self.processe = None
            self.log_file = os.path.join(self.dir, f"logs/{task_name}.log")
            return self.log_list, self.log_dict, self.running_status, self.current_task, self.stop_event, self.log_file
        
    def set_cur_process(self, process):
        with self.lock:
            self.processe = process
    
    def get_cur_process(self):
        with self.lock:
            return self.processe
        
    def get_current_status(self):
        with self.lock:
            return self.current_task, self.running_status


