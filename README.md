# Multi-Agent Workflow Visualization

[![GitHub license](https://img.shields.io/github/license/frank-hyt/multi-agent-workflow-visualization?cacheSeconds=3600)](LICENSE)



## Motivation

During the development of my multi-agent project, where different agents are responsible for processing information in various domains and interacting with each other, I found the process of multi-agent interaction to be quite unintuitive and even chaotic. This led me to create this project to visualize the interactions between agents more clearly.


## Features

- **Multi-Agent Communication Visualization**: Real-time visualization of interactions between agents.
- **Embedded Python Code Editor**: Built-in Python code editor with autocomplete suggestions and syntax checking, allowing you to easily write agent logic directly on the frontend.
- **Direct Frontend Workflow Management**: You can interact with agents' workflows directly from the frontend, including adding interactions between agents (add edges), running the entire workflow, and viewing the execution logs.
- **Convenient Log Display**: Any part of the agent workflow can include `print` statements to display logs in the frontend's log panel, making it easier to track and debug agent actions.


## Installation

1. Clone this project:
   ```bash
   git clone https://github.com/frank-hyt/multi-agent-workflow-visualization.git
   ```

2. Navigate to the project directory:
   ```bash
   cd <project_directory>
   ```

3. Install the required dependencies:
   ```bash
   pip install -r ./back_end/requirements.txt
   ```

4. Run the project:
   ```bash
   sudo bash ./run.sh
   ```


## Little Demo

![demo](./material/demo.gif)


## Different Nodes Template

### Input Node:
The starting point of the agent flow (trigger), generates data in the form of a dictionary (e.g., LLM instructions) to provide to the agent. The `running` function can be either a regular function or a generator.

```python
class Input[NamePlaceholder]:

    def __init__(self):
        pass

    def running(self):
        """
        Running process.
        Generates start input.
        """
        return "Hello!"
```

---

### Agent Node:
Agent Node include 4 the different components: memory, input processing, decision-making, and taking actions.

#### 1. **Memory**: 
The `__init__` function stores the agent's memory.

#### 2. **Input Processor**: 
The `preprocess` function processes the input data.

#### 3. **Decision Making**: 
The `decision_make` function takes the processed data and outputs a specific action name. This is where the agent uses a Large Language Model (LLM) for planning.

#### 4. **Taking Action**: 
The `act_[NamePlaceholder]` function executes the agent's actions based on the output of the `decision_make` function.

```python
# Example of a simple agent template
class Agent[NamePlaceholder]:

    def __init__(self):
        """
        Initialize agent's memory.
        """
        pass

    def preprocess(self, input_dict):
        """
        Preprocess the input data.
        
        Parameters:
        - input_dict (dict): The output from another node.

        Returns:
        - dict: The processed input data.
        """
        return input_dict

    def decision_make(self, processed_dict):
        """
        Planning function to decide on an action.
        
        Parameters:
        - processed_dict (dict): The processed data from preprocess function.

        Returns:
        - str: The name of the action to be taken.
        """
        return '[NamePlaceholder]'

    def act_[NamePlaceholder](self, processed_dict):
        """
        Take an action based on the processed data.
        
        Parameters:
        - processed_dict (dict): The processed data from decision_make function.

        Returns:
        - dict: The resulting data after the action is taken.
        """
        return processed_dict
```

---

### Output Node:
This node accepts dictionary-type input and processes it in the best way possible (e.g., saving, printing).

```python
class OutputNodeName:

    def __init__(self):
        pass

    def running(self, input_dict):
        """
        Process and save the data, then log the final output.

        Parameters:
        - input_dict (dict): The input data to be processed.

        Returns:
        - None: Outputs are handled through logging.
        """
        print("output")
        return
```

## Contributing

Welcome contributions! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and test them.
4. Submit a pull request with a description of the changes.


## License

This project is open-source and licensed under the MIT License.

## Contact

For any questions or inquiries, please reach out to [heyitao1995@gmail.com].
