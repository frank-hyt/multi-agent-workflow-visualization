import ast
import os
import json
from typing import Dict, Tuple, List
from collections import defaultdict

from data_model import CodeBlock, NodeData, Node, RuntimeNode, Edge, NodePos, NodeMidInfo
from constant import CodeTypeEnum, ClassTypeEnum, NodeRestriction, PredefineFunc, PrefixDynamicFunc


def get_module_name(file_path):
    return os.path.splitext(os.path.basename(file_path))[0]


def parser_code(source_code):
    code_blocks = []
    source_code_lines = [""]+source_code.split("\n")
    # get ast tree
    parsed_ast = ast.parse(source_code)

    # ast first level
    for node in parsed_ast.body:
        # class block
        if isinstance(node, ast.ClassDef):
            class_type = None
            # class Info
            # detect node class
            for type_name in ClassTypeEnum:
                if node.name.startswith(type_name.value):
                    class_type = type_name.value
                    prefix = type_name.value
                    name = node.name[len(type_name.value):]        
            if class_type is not None:
                code = ast.unparse(node).strip().split("\n")[0]
                code_blocks.append(CodeBlock(code=code, name=name, prefix=prefix, codeType=CodeTypeEnum.className, numLines=1, blockIndex=len(code_blocks)))

                # function in class
                for class_body_node in node.body:
                    if isinstance(class_body_node, ast.FunctionDef):
                        # code = astor.to_source(class_body_node)
                        code_start_line, code_stop_line = class_body_node.lineno, class_body_node.end_lineno
                        num_code_lines = code_stop_line-code_start_line+1
                        code = "\n".join(source_code_lines[code_start_line:code_stop_line+1])
                        if_detect_func = False
                        # predifined func
                        for fixFunc in  PredefineFunc:
                            if class_body_node.name == fixFunc.value:
                                code_blocks.append(CodeBlock(code=code, name=class_body_node.name, prefix="", codeType=CodeTypeEnum.fixNameFunc, numLines=num_code_lines, blockIndex=len(code_blocks)))
                                if_detect_func = True
                                break
                        
                        # dynamic func
                        for dynamicFunc in PrefixDynamicFunc:
                            if class_body_node.name.startswith(dynamicFunc.value):
                                name = class_body_node.name[len(dynamicFunc.value)+1:]
                                code_blocks.append(CodeBlock(code=code, name=name, prefix=dynamicFunc.value, codeType=CodeTypeEnum.renameAbleFunc, numLines=num_code_lines, blockIndex=len(code_blocks)))
                                if_detect_func = True
                                break
                        
                        # other func
                        if not if_detect_func:
                            code_blocks.append(CodeBlock(code=code, name=class_body_node.name, prefix="", codeType=CodeTypeEnum.unknow, numLines=num_code_lines, blockIndex=len(code_blocks)))
            else:
                # code = astor.to_source(node)
                code_start_line, code_stop_line = node.lineno, node.end_lineno
                num_code_lines = code_stop_line-code_start_line+1
                code = "\n".join(source_code_lines[code_start_line:code_stop_line+1])
                code_blocks.append(CodeBlock(code=code, name=node.name, prefix="", codeType=CodeTypeEnum.unknow, numLines=num_code_lines, blockIndex=len(code_blocks)))
                        
        elif isinstance(node, ast.Import):
            code_start_line, code_stop_line = node.lineno, node.end_lineno
            num_code_lines = code_stop_line-code_start_line+1
            code = "\n".join(source_code_lines[code_start_line:code_stop_line+1])
            # if isinstance(node, ast.Import):
            code_blocks.append(CodeBlock(code=code, name="import", prefix="", codeType=CodeTypeEnum.unknow, numLines=num_code_lines, blockIndex=len(code_blocks)))

        else:
            if hasattr(node, 'lineno'):
                # code = astor.to_source(node)
                code_start_line, code_stop_line = node.lineno, node.end_lineno
                num_code_lines = code_stop_line-code_start_line+1
                code = "\n".join(source_code_lines[code_start_line:code_stop_line+1])                    
                code_blocks.append(CodeBlock(code=code, name=node.name if hasattr(node, 'name') else "unknow", prefix="", codeType=CodeTypeEnum.unknow, numLines=num_code_lines, blockIndex=len(code_blocks)))
    
    cnt_dict = defaultdict(int)
    basic_code_blocks, dynamic_code_blocks = [], []
    type_str, id_str = None, None
    for item in code_blocks:
        # skip othor code
        if item.codeType == CodeTypeEnum.unknow:
            continue
        cnt_dict[item.codeType] += 1
        cnt_dict[item.name] += 1
        cnt_dict[item.prefix] += 1
        if item.codeType == CodeTypeEnum.className.value:
            type_str = item.prefix
            id_str = item.name
        if item.prefix in [item_f.value for item_f in PrefixDynamicFunc]:
            dynamic_code_blocks.append(item)
        else:
            basic_code_blocks.append(item)

    if cnt_dict["className"] != 1:
        # print('cnt_dict["className"]:', cnt_dict["className"])
        return False, None

    for key in NodeRestriction:
        if cnt_dict[key] == 1:
            if all([cnt_dict[func_name]==1 for func_name in NodeRestriction[key]]):
                return True, NodeMidInfo(type=type_str, nodeData=NodeData(name=id_str, basicCodeBlocks=basic_code_blocks, dynamicCodeBlocks=dynamic_code_blocks))
    return False, None


def parser_code_file(code_file, pos: NodePos=NodePos(x=0, y=0)):
    node_id = get_module_name(code_file)
    with open(code_file, 'r') as file:
        source_code = file.read()
        sucess, parsered_data = parser_code(source_code)
        if sucess:
            type_name = parsered_data.type
            node_data = parsered_data.nodeData
            return sucess, RuntimeNode(file=code_file, node=Node(id=node_id, type=type_name,
                                                         posX=pos.x, posY=pos.y, data=node_data))
    return False, None


def check_nodes_edges(nodes: Dict[str, RuntimeNode], edges: Dict[Tuple[str, str], str]):
    for k, target_node_id in edges.items():
        (node_id, act_name) = k
        if node_id not in nodes or target_node_id not in nodes:
            return False
        if act_name not in [item.name for item in nodes[node_id].node.data.dynamicCodeBlocks]:
            return False
    return True


def check_root_of_edges(nodes: Dict[str, RuntimeNode], edges: Dict[Tuple[str, str], str]):
    input_nodes = []
    for k, target_node_id in edges.items():
        (node_id, act_name) = k
        if nodes[node_id].node.type == ClassTypeEnum.input_node.value:
            input_nodes.append((node_id, act_name))
    if len(input_nodes) == 1:
        return True, input_nodes[0]
    return False, None


def synthesize_code(node: Node):
    code_blocks = node.data.basicCodeBlocks + node.data.dynamicCodeBlocks
    sorted_list = sorted(code_blocks, key=lambda x:x.blockIndex)
    code = "\n".join([item.code if item.name == 'import' else item.code+'\n' for item in sorted_list])
    return code


def synthesize_code_file(node: Node, file_name: str):
    with open(file_name, 'w') as fw:
        fw.write(synthesize_code(node))


# _, node = parser_code_file('/Users/heyitao/program_project/agent_visualization/back_end/node_template/agent.py')
# print(synthesize_code(node))
