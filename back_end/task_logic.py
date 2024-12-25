import sys
import time
import json
import os
import inspect
import importlib
from typing import Dict, Tuple

from collections import defaultdict, Counter
from data_model import RuntimeNode
from project_manager import ProjectSingleton
from constant import PredefineFunc, ClassTypeEnum, PrefixDynamicFunc

# costom log streaming
class LogStream:
    def __init__(self, log_file, log_list):
        self.log_list = log_list
        self.file_stream = open(log_file, "a")  # 打开日志文件追加记录

    def write(self, message: str):
        if message.strip():  # 过滤空消息
            self.log_list.append(message)
            self.file_stream.write(message + "\n")  # 写入文件

    def flush(self):
        self.file_stream.flush()

    def close(self):
        self.file_stream.close()


# task process
def task_logic(proj_dir, log_list, log_dict, stop_event, log_file, running_status, current_task,
                max_loop, run_nodes: Dict[str, RuntimeNode], run_edges: Dict[Tuple[str, str], str],
                start_node, start_act):
    log_stream = LogStream(log_file, log_list)
    sys.stdout = log_stream  # redirect print
    try:
        print("Task started.")
        running_status.value = "running"
        sys.path.append(proj_dir)
        # cache the instances of nodes
        instance_dict = {}
        for node_id, run_node in run_nodes.items():
            module_path = run_node.file
            module_name = os.path.splitext(os.path.basename(module_path))[0]
            class_name = run_node.node.type+run_node.node.data.name
            # import a module of a node
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            # import the module
            spec.loader.exec_module(module)
            cls = getattr(module, class_name)
            # create an instance for a node
            instance_dict[node_id] = cls()
        # task timeline
        task_step_time = 0
        root_node = parent_node = (start_node, start_act)
        # perform the input node
        node_log_start = len(log_list)
        print("*"*3+f"Time Step {task_step_time}"+"*"*3)
        print("**Now Input Node is Running")
        method_name = PredefineFunc.runningFunc.value
        method = getattr(instance_dict[parent_node[0]], method_name)
        if inspect.isgeneratorfunction(method):
            print("Input is a generator.")
            generated_input_info = method()
        else:
            print(f"Input is not a generator.")
            generated_input_info = [method(),]
        node_log_stop = len(log_list)
        # save specific node log 
        log_dict[parent_node[0]] = log_dict.get(parent_node[0], []) + [(node_log_start, node_log_stop),]
        # go to the loop
        edge_log_start = len(log_list)
        for one_input_item in generated_input_info:
            print("**Got one input")
            # save specific edge log 
            edge_log_stop = len(log_list)
            log_dict[root_node] = log_dict.get(root_node, []) + [(edge_log_start, edge_log_stop), ]
            parent_out = one_input_item
            # detect loop times by circle length
            node_loop_dict = defaultdict(lambda : Counter())
            history_node_time_stamp = {}
            while parent_node in run_edges:
                task_step_time += 1
                # get next node
                next_node_id = run_edges[parent_node]
                # update the count of loop for one node
                if next_node_id in history_node_time_stamp:
                    circle_length = task_step_time - history_node_time_stamp[next_node_id] + 1
                    node_loop_dict[circle_length] += 1
                # update time stamp    
                history_node_time_stamp[next_node_id] = task_step_time
                next_node_type = run_nodes[next_node_id].node.type
                node_log_start = len(log_list)
                # update current node
                current_task['current_node'] = next_node_id
                # perform a node
                print("*"*3+f"Time Step {task_step_time}"+"*"*3)
                node_name = run_nodes[next_node_id].node.data.name
                print(f"**Now perform Node[{node_name}]")
                if next_node_type == ClassTypeEnum.agent_node.value:
                    method = getattr(instance_dict[next_node_id], PredefineFunc.preprocessFunc.value)
                    print(f"*preprocess*")
                    processed_input = method(parent_out)
                    method = getattr(instance_dict[next_node_id], PredefineFunc.planningFunc.value)
                    print(f"*decision_make*")
                    act_name = method(processed_input)
                    # update current act
                    current_task['current_act'] = act_name
                    print(f"*act_{act_name}*")
                    # take a action
                    edge_log_start = len(log_list)
                    # update next parent
                    parent_node = (next_node_id, act_name)
                    print(f"**Node[{node_name}]: Act[{act_name}] -> Node[{run_nodes[run_edges[parent_node]].node.data.name}]**")
                    method = getattr(instance_dict[next_node_id], PrefixDynamicFunc.actFunc.value+"_"+act_name)
                    parent_out = method(processed_input)
                    # save specific edge log 
                    edge_log_stop = len(log_list)
                    log_dict[parent_node] = log_dict.get(parent_node, []) + [(edge_log_start, edge_log_stop),]
                    # save specific node log
                    node_log_stop = len(log_list)
                    log_dict[next_node_id] = log_dict.get(next_node_id, []) + [(node_log_start, node_log_stop),]
                elif next_node_type == ClassTypeEnum.output_node.value:
                    current_task['current_act'] = None
                    method = getattr(instance_dict[next_node_id], PredefineFunc.runningFunc.value)
                    final_output = method(parent_out)
                    # save specific node log
                    node_log_stop = len(log_list)
                    log_dict[next_node_id] = log_dict.get(next_node_id, []) + [(node_log_start, node_log_stop),]
                    break
                else:
                    # never here
                    print("!!error: unexpected node!!")
                    running_status.value = "error"
                    return
                if stop_event.is_set():
                    # every step check the stop signal
                    running_status.value = "interrupt"
                    print(f"!!Task stopped during step {task_step_time}!!")
                    return
                # check the times of loop if exceed
                if any([cnt_item[1]>max_loop for v in node_loop_dict.values() for cnt_item in v.most_common(1)]):
                    print("!!error: some nodes exceed the max loop!!")
                    running_status.value = "error"
                    return
            edge_log_start = len(log_list)
        print("Task completed.")
        running_status.value = "complete"
    except Exception as e:
        running_status.value = "error"
        print(f"!!Task failed: {e}!!")
        node_log_stop = len(log_list)
        log_dict[next_node_id] = log_dict.get(next_node_id, []) + [(node_log_start, node_log_stop),]
    finally:
        task_name = current_task['task_name']
        log_dir = os.path.join(proj_dir, 'logs')
        log_list_file = os.path.join(log_dir, f"{task_name}_log_list.json")
        log_dict_file = os.path.join(log_dir, f"{task_name}_log_dict.json")
        json.dump(list(log_list), open(log_list_file, "w"))
        log_dict_save_form = [{"key": k, "value": v} for k, v in dict(log_dict).items()]
        json.dump(log_dict_save_form, open(log_dict_file, "w"))
        current_task.update({"task_name": None, "current_node": None, "current_act": None})
        log_stream.flush()

