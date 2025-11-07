from typing import List, Dict, Optional, Any, Union
import json
import csv
import os
import pandas as pd
import numpy as np
from app.models.request_models import Example, EvaluationExample
from app.core.config import UseCase, Technique, ModelFamily, get_model_family,USE_CASE_CONFIGS, LENDING_DATA_PROMPT, USE_CASE_CONFIGS_EVALS
from app.core.data_loader import DataLoader
from app.core.data_analyser import DataAnalyser
from app.core.summary_formatter import SummaryFormatter

DEFAULT_SCHEMA = """CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary DECIMAL(10,2)
);

CREATE TABLE departments (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    manager_id INT,
    budget DECIMAL(15,2)
);

CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    registration_date DATE,
    total_orders INT DEFAULT 0
);

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INT,
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    shipping_address TEXT,
    shipping_cost DECIMAL(8,2),
    total_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2),
    discount DECIMAL(5,2) DEFAULT 0,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
"""



DEFAULT_freeform_TEXT2SQL_PROMPT = """Requirements:
- Each solution must be a working SQL query
- Include explanations where needed
- Follow the same format as the examples
- Ensure queries are properly formatted
- Each object MUST have exactly these two fields:
    - "question"
    - "solution"""


DEFAULT_freeform_CODE_GENERATION_PROMPT = """Requirements:
- Each solution must include working code examples
- Include explanations with the code
- Follow the same format as the examples
- Ensure code is properly formatted with appropriate indentation
- Each object MUST have exactly these two fields:
    - "question"
    - "solution"""

Default_freeform_lending_data_prompt = """
 You need to create profile data for the LendingClub company which specialises in lending various types of loans to urban customers.
 

You need to generate the data in the same order for the following  fields (description of each field is followed after the colon):

loan_amnt: The listed amount of the loan applied for by the borrower. If at some point in time, the credit department reduces the loan amount, then it will be reflected in this value.
term: The number of payments on the loan. Values are in months and can be either 36 months or 60 months.
int_rate: Interest Rate on the loan
installment: The monthly payment owed by the borrower if the loan originates.
grade: LC assigned loan grade (Possible values: A, B, C, D, E, F, G)
sub_grade: LC assigned loan subgrade (Possible sub-values: 1-5 i.e A5)
emp_title: The job title supplied by the Borrower when applying for the loan.
emp_length: Employment length in years. Possible values are between 0 and 10 where 0 means less than one year and 10 means ten or more years.
home_ownership: The home ownership status provided by the borrower during registration or obtained from the credit report. Our values are: RENT, OWN, MORTGAGE, OTHER
annual_inc: The self-reported annual income provided by the borrower during registration.
verification_status: Indicates if income was verified by LC, not verified, or if the income source was verified
issue_d: The month which the loan was funded
loan_status: Current status of the loan
purpose: A category provided by the borrower for the loan request.
title: The loan title provided by the borrower
dti: A ratio calculated using the borrower’s total monthly debt payments on the total debt obligations, excluding mortgage and the requested LC loan, divided by the borrower’s self-reported monthly income.
earliest_cr_line: The month the borrower's earliest reported credit line was opened
open_acc: The number of open credit lines in the borrower's credit file.
pub_rec: Number of derogatory public records
revol_bal: Total credit revolving balance
revol_util: Revolving line utilization rate, or the amount of credit the borrower is using relative to all available revolving credit.
total_acc: The total number of credit lines currently in the borrower's credit file
initial_list_status: The initial listing status of the loan. Possible values are – W, F
application_type: Indicates whether the loan is an individual application or a joint application with two co-borrowers
mort_acc: Number of mortgage accounts.
pub_rec_bankruptcies: Number of public record bankruptcies
address: The physical address of the person

Ensure PII from examples such as addresses are not used in the generated data to minimize any privacy concerns.
"""

DEFAULT_TEXT2SQL_PROMPT = """Requirements:
- Each solution must be a working SQL query
- Include explanations where needed
- Follow the same format as the examples
- Ensure queries are properly formatted
 """


DEFAULT_CODE_GENERATION_PROMPT = """Requirements:
- Each solution must include working code examples
- Include explanations with the code
- Follow the same format as the examples
- Ensure code is properly formatted with appropriate indentation
"""

DEFAULT_TEXT2SQL_EVAL_PROMPT = """Below is a SQL Query Question and Solution pair generated by an LLM. Evaluate its quality as a Senior Database Developer would, considering its suitability for professional use. Use the additive 5-point scoring system described below.

Points are accumulated based on the satisfaction of each criterion:
    1. Add 1 point if the query retrieves the basic required data, even if it includes some minor issues or non-optimal approaches.
    2. Add another point if the query is generally correct but lacks refinement in style or fails to follow some best practices. It might use inconsistent naming or have occasional inefficiencies.
    3. Award a third point if the query is appropriate for professional use and accurately retrieves the required data. It demonstrates good understanding of SQL concepts and common patterns, though it may not be optimal. It resembles the work of a competent database developer but may have room for improvement in efficiency or organization.
    4. Grant a fourth point if the query is highly efficient and follows SQL best practices, exhibiting consistent style and appropriate commenting. It could be similar to the work of an experienced developer, offering proper indexing considerations, efficient joins, and effective use of SQL features. The result is performant, well-structured, and valuable for production use.
    5. Bestow a fifth point if the query is outstanding, demonstrating mastery of SQL and database principles. It includes optimization for large datasets, proper handling of NULL values, consideration for execution plans, and excellent documentation. The solution is scalable, performs well, and shows attention to edge cases and data integrity.
"""
DEFAULT_CODE_GENERATION_EVAL_PROMPT = """Below is a Python coding Question and Solution pair generated by an LLM. Evaluate its quality as a Senior Developer would, considering its suitability for professional use. Use the additive 5-point scoring system described below.

Points are accumulated based on the satisfaction of each criterion:
    1. Add 1 point if the code implements basic functionality and solves the core problem, even if it includes some minor issues or non-optimal approaches.
    2. Add another point if the implementation is generally correct but lacks refinement in style or fails to follow some best practices. It might use inconsistent naming conventions or have occasional inefficiencies.
    3. Award a third point if the code is appropriate for professional use and accurately implements the required functionality. It demonstrates good understanding of Python concepts and common patterns, though it may not be optimal. It resembles the work of a competent developer but may have room for improvement in efficiency or organization.
    4. Grant a fourth point if the code is highly efficient and follows Python best practices, exhibiting consistent style and appropriate documentation. It could be similar to the work of an experienced developer, offering robust error handling, proper type hints, and effective use of built-in features. The result is maintainable, well-structured, and valuable for production use.
    5. Bestow a fifth point if the code is outstanding, demonstrating mastery of Python and software engineering principles. It includes comprehensive error handling, efficient algorithms, proper testing considerations, and excellent documentation. The solution is scalable, performant, and shows attention to edge cases and security considerations.
"""



class PromptHandler:
    """Handles prompt generation for different model families and use cases"""

    @staticmethod
    def format_examples(examples: List[Example]) -> str:
        """Format examples as JSON string"""
        return [
            {"question": example.question, "solution": example.solution}
            for example in (examples)
        ]

    @staticmethod
    def format_examples_eval(examples: List[EvaluationExample]) -> str:
        """Format examples as JSON string"""
        return [
                        {"score": example.score, "justification": example.justification}
                        for example in (examples)
                    ]

    @staticmethod
    def get_default_schema(use_case: UseCase, schema) -> str:
        """Get default schema for SQL use case"""
        if use_case == UseCase.TEXT2SQL:
            if schema == None:
                return DEFAULT_SCHEMA
            else:
                return schema
        elif use_case == UseCase.CODE_GENERATION:
            schema = None

        else:
            schema = None
        
        return schema
    
    
    @staticmethod
    def get_default_custom_prompt(use_case:UseCase, custom_prompt):
        if custom_prompt == None:
            if use_case == UseCase.TEXT2SQL:
                custom_prompt = DEFAULT_TEXT2SQL_PROMPT
                return custom_prompt
            elif use_case == UseCase.CODE_GENERATION:
                custom_prompt =  DEFAULT_CODE_GENERATION_PROMPT
                return custom_prompt
            elif use_case == UseCase.CUSTOM:
                custom_prompt = " "
                return custom_prompt
        else:
            return custom_prompt
        
    @staticmethod
    def get_freeform_default_custom_prompt(use_case:UseCase, custom_prompt):
        if custom_prompt == None:
            if use_case == UseCase.TEXT2SQL:
                custom_prompt = DEFAULT_freeform_TEXT2SQL_PROMPT
                return custom_prompt
            elif use_case == UseCase.CODE_GENERATION:
                custom_prompt =  DEFAULT_freeform_CODE_GENERATION_PROMPT
                return custom_prompt
            elif use_case == UseCase.CUSTOM:
                custom_prompt = " "
                return custom_prompt
        else:
            return custom_prompt
    
    @staticmethod
    def get_default_custom_eval_prompt(use_case:UseCase, custom_prompt):
        if custom_prompt == None:
            return USE_CASE_CONFIGS_EVALS[use_case].prompt
        else:
            return custom_prompt
    @staticmethod
    def get_default_example(use_case: UseCase, examples) -> str:
       
        
        if examples == [] or examples == None:
                if use_case == UseCase.CUSTOM:
                    examples = [
                                    {
                                        "question": "What is the capital of France?",
                                        "solution": "The capital of France is Paris."
                                    },
                                    {
                                        "question": "Calculate the area of a rectangle with length 5 and width 3.",
                                        "solution": "Area = length x width = 5 x 3 = 15 square units"
                                    }
                                ]
                    return examples
                else:
                    return USE_CASE_CONFIGS[use_case].default_examples
        
        return PromptHandler.format_examples(examples)
    
    @staticmethod
    def get_default_eval_example(use_case: UseCase, examples) -> str:
        
        
        if examples == [] or examples == None:
                
                if use_case == UseCase.CODE_GENERATION:
                    examples = [
                                {
                    "score": 3,
                    "justification": """The code achieves 3 points by implementing core functionality correctly (1), 
                    showing generally correct implementation with proper syntax (2), 
                    and being suitable for professional use with good Python patterns and accurate functionality (3). 
                    While it demonstrates competent development practices, it lacks the robust error handling 
                    and type hints needed for point 4, and could benefit from better efficiency optimization and code organization."""
                },
                {
                    "score": 4,
                    "justification": """
                    The code earns 4 points by implementing basic functionality (1), showing correct implementation (2), 
                    being production-ready (3), and demonstrating high efficiency with Python best practices 
                    including proper error handling, type hints, and clear documentation (4). 
                    It exhibits experienced developer qualities with well-structured code and maintainable design, though 
                    it lacks the comprehensive testing and security considerations needed for a perfect score."""
                }
                        ]
                    return examples
                
                elif use_case == UseCase.TEXT2SQL:

                    examples = [ {
                    "score": 3,
                    "justification": """The query earns 3 points by successfully retrieving basic data (1), 
                    showing correct logical implementation (2), and being suitable for
                    professional use with accurate data retrieval and good SQL pattern understanding (3). 
                    However, it lacks efficiency optimizations and consistent style conventions needed for
                     point 4, using basic JOINs without considering indexing or performance implications. 
                     While functional, the query would benefit from better organization and efficiency improvements."""
                            },

                    {
                "score": 4,
                "justification": """The query merits 4 points by retrieving basic data correctly (1), implementing proper 
                logic (2), being production-ready (3), and demonstrating high efficiency with proper
                  indexing considerations, well-structured JOINs, and consistent formatting (4). It 
                  shows experienced developer qualities with appropriate commenting and performant SQL 
                  features, though it lacks the comprehensive NULL handling and execution plan optimization needed for a 
                  perfect score."""
                    }
                    ]
                    return examples
                elif use_case == UseCase.CUSTOM:
                    examples = [
                            {
                                "score": 1,
                                "justification": "The response demonstrates basic understanding but lacks depth and detail. While it provides minimal relevant information, significant improvement is needed in comprehensiveness, accuracy, and overall quality."
                            },
                            {
                                "score": 2,
                                "justification": "The response shows moderate understanding with some relevant details. While key points are addressed, there are gaps in thoroughness and depth that could be improved for better quality and comprehensiveness."
                            },
                            {
                                "score": 3, 
                                "justification": "The response demonstrates good understanding (1), provides accurate information (2), and shows solid comprehension of the subject matter (3). While it effectively addresses the main points, it could benefit from more detailed analysis and supporting examples."
                            },
                            {
                                "score": 4,
                                "justification": "The response excels by showing thorough understanding (1), providing comprehensive details (2), demonstrating clear analysis (3), and offering well-supported insights with relevant examples (4). It effectively addresses all key aspects while maintaining clarity and depth throughout."
                            },
                            {
                                "score": 5,
                                "justification": "The response achieves excellence through exceptional understanding (1), comprehensive coverage (2), insightful analysis (3), well-supported arguments (4), and outstanding presentation with compelling examples and thorough explanations (5). It represents a complete and authoritative treatment of the subject."
                            }
                            ]
                    
                    return examples
        
        return PromptHandler.format_examples_eval(examples)
    

    @staticmethod
    def get_default_single_generate_example(use_case: UseCase, examples) -> str:
        
        
        if examples == [] or examples == None:
                
                if use_case == UseCase.CODE_GENERATION:
                    examples = [
                  """#Here's how to create and modify a list in Python:
                  # Create an empty list\n
                  my_list = []
                  #  Add elements using append\n
                  my_list.append(1)\n
                  my_list.append(2)\n\n
                  # # Create a list with initial elements
                  my_list = [1, 2, 3]
                  """,

                  """#Here's how to implement a basic stack:class Stack:
                  def __init__(self):
                    self.items = []
                  def push(self, item):
                    self.items.append(item)
                  def pop(self):
                    if not self.is_empty():
                    return self.items.pop()
                  def is_empty(self):
                    return len(self.items) == 0"""
                
                    
                        ]
                    return "\n\n".join(examples)
                    
                
                elif use_case == UseCase.TEXT2SQL:

                    examples = [ """
                                SELECT e.name, d.department_name
                                FROM employees e
                                JOIN departments d ON 
                                e.department_id = d.id;""",

                                """SELECT *
                                  FROM employees
                                  WHERE salary > 50000;"""
                    ]
                    return "\n\n".join(examples)
                    
                elif use_case == UseCase.CUSTOM:
                    examples = []
                    return " "
                   
        
        return "\n\n".join(examples)
        
        
        

class ModelPrompts:
    """Model family specific prompt templates"""

    @staticmethod
    def get_generate_prompt(model_id: str,
        use_case: UseCase,
        topic: str,
        num_questions: int,
        omit_questions: List,
        examples: List[Example],
        technique: Technique = Technique.SFT,
        schema = Optional[str],
        custom_prompt = Optional[str]
    ) -> str:
        
        examples_str = PromptHandler.get_default_example(use_case, examples)
        
        #print(examples, '\n', examples_str)
        schema_str = PromptHandler.get_default_schema(use_case, schema)
        custom_prompt_str = PromptHandler.get_default_custom_prompt(use_case, custom_prompt)

        # base_prompt = f"""<examples>
        #         {examples_str}
        #         </examples>

        #         """
        base_prompt = '\n' + "You are a very helpful assistant which creates a valid json array based on instructions given"

        # handling duplicates for each topics
        if len(omit_questions)==0:
           omit_prompt =  " "
        else:
            # Join the questions list with newlines and bullet points
            formatted_questions = " | ".join(omit_questions)
            omit_prompt =  "Make it absolutely sure that you don't include questions mentioned in below list as we already have question pair solutions for them. \n\n"+ formatted_questions
        
        json_instruction = f"""Output MUST be a JSON array with objects in this exact format:
                
              Requirements:
                1. MUST be a valid, parseable JSON array
                2. Each object MUST have exactly these two fields:
                - "question"
                - "solution"
                3. Examples for reference:
                <examples>
                {examples_str}
                </examples>
                4. Format rules:
                - Use ONLY double quotes (")
                - Properly escape all special characters
                - No trailing commas
                - No text or comments outside the JSON array

                Return ONLY the JSON array."""
        json_prompt = omit_prompt +  '\n' +  json_instruction

        if use_case == UseCase.CODE_GENERATION:
            base_prompt += f"""Create {num_questions} programming question-solution pairs about the following topic:
                        <topic>{topic}</topic>"""

            
        elif use_case == UseCase.TEXT2SQL:
            base_prompt += f"""Using this database schema:
                            {schema_str}

                            Create {num_questions} natural language to SQL query pairs about the following topic:
                            <topic>{topic}</topic>"""

        elif use_case == UseCase.CUSTOM:
            base_prompt+= f"""Create {num_questions} question-solution pairs about the following topic:
                        <topic>{topic}</topic>""" 
            
        model_family = get_model_family(model_id)
        
        if model_family== ModelFamily.LLAMA:
            
            final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + '\n'  + base_prompt + '\n' + custom_prompt_str + '\n' + json_prompt + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        elif model_family== ModelFamily.MISTRAL:
            system_prompt = "[INST]"
            final_prompt = system_prompt +  "\n" + base_prompt + '\n' + custom_prompt_str +  '\n'  + json_prompt + '\n'+ '[/INST]'

        elif model_family == ModelFamily.CLAUDE:
            final_prompt = base_prompt + '\n' + custom_prompt_str + "\n" + json_prompt 
        elif model_family== ModelFamily.QWEN:
            system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
            final_prompt = f'''<|im_start|>system
                                {system_prompt}<|im_end|>
                                <|im_start|>user
                                {base_prompt}
                                {custom_prompt_str}
                                {json_prompt}<|im_end|>
                                <|im_start|>assistant
                                '''
            
        else:
            final_prompt = base_prompt + '\n' + custom_prompt_str + "\n" + json_prompt 
        
        return final_prompt

    
    @staticmethod
    def get_eval_prompt(model_id: str,
        use_case: UseCase,
        question: str,
        solution: str,
        examples: List[EvaluationExample],
        custom_prompt = Optional[str]
    ) -> str:
        custom_prompt_str = PromptHandler.get_default_custom_eval_prompt(use_case, custom_prompt)   
        examples_str = PromptHandler.get_default_eval_example(use_case, examples)
        
        base_prompt = """ You are a brilliant judge on evaluating quality of question and answer pair.
          Follow the given instructions below to evaluate given question and answer pair."""
        final_instruction = f"""Question: {question}
            Solution: {solution}

            After examining the solution:
            Provide your evaluation in a JSON array format following these requirements:. 
            1. The response MUST be a valid JSON array containing objects
            2. Each object MUST have exactly two fields:
            - "score": a number based on the requirements explained above.
            - "justification": a string explaining the score
            
            3. Ensure all quotes are double quotes (")
            4. No comments or additional text outside the JSON array
            5. All strings must be properly escaped
            6. Follow this exact structure as given below.
            Example format:
            {examples_str}"""
        model_family = get_model_family(model_id)
        
        if model_family== ModelFamily.LLAMA:
            
            final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + base_prompt + '\n' +  custom_prompt_str + '\n' + final_instruction + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        elif model_family== ModelFamily.MISTRAL:
            
            final_prompt = "[INST]" + base_prompt + "\n" + custom_prompt_str + '\n' + final_instruction + '\n' + '[/INST]'

        elif model_family == ModelFamily.CLAUDE:
            final_prompt = custom_prompt_str + "\n" + final_instruction 
        elif model_family== ModelFamily.QWEN:
            system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
            final_prompt = f'''<|im_start|>system
                                {system_prompt}<|im_end|>
                                <|im_start|>user
                                {base_prompt}
                                {custom_prompt_str}
                                {final_instruction}<|im_end|>
                                <|im_start|>assistant
                                '''
        else:

            final_prompt = custom_prompt_str + "\n" + final_instruction 
        return final_prompt
    
    @staticmethod
    def get_freeform_eval_prompt(model_id: str,
        use_case: UseCase,
        row: Dict[str, Any],
        examples: List[EvaluationExample],
        custom_prompt = Optional[str]
    ) -> str:
        custom_prompt_str = PromptHandler.get_default_custom_eval_prompt(use_case, custom_prompt)   
        #examples_str = PromptHandler.get_default_eval_example(use_case, examples)
        
        if examples:
            examples_str = PromptHandler.format_examples_eval(examples)
        
        elif examples == [] or examples == None:
            examples_str = str(USE_CASE_CONFIGS_EVALS[use_case].default_examples)        
        base_prompt = """ You are a brilliant judge on evaluating a set of data with fields and corresponding values
          Follow the given instructions to understand the structure of given data and evaluate it based on parameters defined for you."""
        final_instruction = f"""data row: {row}
            

            After examining the data based on provided instructions:
            Provide your evaluation in a JSON array format following these requirements:. 
            1. The response MUST be a valid JSON array containing objects
            2. Each object MUST have exactly two fields:
            - "score": a number based on the requirements explained above.
            - "justification": a string explaining the score
            
            3. Ensure all quotes are double quotes (")
            4. No comments or additional text outside the JSON array
            5. All strings must be properly escaped
            6. Follow this exact structure as given below.
            Example format:
            {examples_str}"""
        model_family = get_model_family(model_id)
        
        if model_family== ModelFamily.LLAMA:
            
            final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + base_prompt + '\n' +  custom_prompt_str + '\n' + final_instruction + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        elif model_family== ModelFamily.MISTRAL:
            
            final_prompt = "[INST]" + base_prompt + "\n" + custom_prompt_str + '\n' + final_instruction + '\n' + '[/INST]'

        elif model_family == ModelFamily.CLAUDE:
            final_prompt = custom_prompt_str + "\n" + final_instruction 
        elif model_family== ModelFamily.QWEN:
            system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
            final_prompt = f'''<|im_start|>system
                                {system_prompt}<|im_end|>
                                <|im_start|>user
                                {base_prompt}
                                {custom_prompt_str}
                                {final_instruction}<|im_end|>
                                <|im_start|>assistant
                                '''
        else:

            final_prompt = custom_prompt_str + "\n" + final_instruction 
        return final_prompt
    

    # @staticmethod
    # def create_custom_prompt(model_id: str,
    #     custom_prompt:str,
    #     example_path: Optional[str],
    # ) -> str:
        
        
    #     final_instruction = f"""You are a brilliant prompt engineer. Your job is to create a best prompt for provided task: {custom_prompt} which can get 
    #     best response from large language model 
    #     The prompt should Focus on:

    #     - The core task objective
    #     - Key aspects to consider or maintain
    #     - Any special requirements specific to the task.
    #     For example the prompt for code generation is below 
    #     {DEFAULT_CODE_GENERATION_PROMPT}
    # Make sure you just give the prompt in your response which can be directly used by large language model.
    # No need to give any explanation but just the prompt in same format as the example given above.
    #         """
    #     model_family = get_model_family(model_id)
        
    #     if model_family== ModelFamily.LLAMA:
            
    #         final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" +  '\n' +  final_instruction + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

    #     elif model_family== ModelFamily.MISTRAL:
            
    #         final_prompt = '[INST]' +  "\n" + final_instruction + '\n' + '[/INST]'

    #     elif model_family == ModelFamily.CLAUDE:
    #         final_prompt =  "\n" + final_instruction 

    #     elif model_family== ModelFamily.QWEN:
    #         system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
    #         final_prompt = f'''<|im_start|>system
    #                             {system_prompt}<|im_end|>
    #                             <|im_start|>user
                                
    #                             {final_instruction}<|im_end|>
    #                             <|im_start|>assistant
    #                             '''
            

    #     else:
    #         final_prompt =  "\n" + final_instruction 
    #     return final_prompt
    
    @staticmethod
    def create_custom_prompt(
        model_id: str,
        custom_prompt: str,
        example_path: str | None = None,
        example: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        summary_block = ""
        example_block = ""

        if example_path or example:
            try:
                if example_path:
                    print(f"Loading example data from: {example_path}")
                    df = DataLoader.load(example_path)
                elif example:
                    df = pd.DataFrame(example)
                else:
                    df = None

                if df is not None:
                    df = DataLoader.infer_dtypes(df)

                    if "error_message" in df.columns and len(df.columns) == 1:
                        print(f"Error loading data: {df['error_message'][0]}")
                    elif not df.empty:
                        try:
                            print("Analyzing data...")
                            summary_dict = DataAnalyser.analyse(df)
                            summary_block = (
                                "<data_summary>\n"
                                "INSTRUCTIONS: The following analysis provides key insights about the dataset that should guide your synthetic data generation. Use these signals to match distributions and relationships when generating synthetic data.\n\n"
                            )
                            if "columns" in summary_dict:
                                summary_block += ("""
                                ## Column Types\n
                                "These are all  columns identified in the dataset in given specific order:\n\n
                                Make sure to provide definitions of each column in the same order as they are in the dataset.
                                Don't change or skip any column name or order.                                          
                                """)
                                summary_block += "\n".join(f"- {col}" for col in summary_dict["columns"]) + "\n\n"

                            if "statistical_analysis" in summary_dict:
                                summary_block += "## Statistical Analysis\n"
                                if "numeric" in summary_dict["statistical_analysis"]:
                                    summary_block += (
                                        "### Numeric Statistics\n"
                                        f"{json.dumps(summary_dict['statistical_analysis']['numeric'], indent=2)}\n\n"
                                    )
                                if "categorical" in summary_dict["statistical_analysis"]:
                                    summary_block += (
                                        "### Categorical Statistics\n"
                                        f"{json.dumps(summary_dict['statistical_analysis']['categorical'], indent=2)}\n\n"
                                    )
                                if "datetime" in summary_dict["statistical_analysis"]:
                                    summary_block += (
                                        "### DateTime Statistics\n"
                                        f"{json.dumps(summary_dict['statistical_analysis']['datetime'], indent=2)}\n\n"
                                    )

                            if "cross_row_relationship" in summary_dict:
                                summary_block += (
                                    "## Cross-Row Relationships\n"
                                    f"{json.dumps(summary_dict['cross_row_relationship'], indent=2)}\n\n"
                                )
                            if "cross_column_relationship" in summary_dict:
                                summary_block += (
                                    "## Cross-Column Relationships\n"
                                    f"{json.dumps(summary_dict['cross_column_relationship'], indent=2)}\n\n"
                                )

                            summary_block += "</data_summary>\n"
                            print("Data analysis completed successfully.")
                        except Exception as e:
                            print(f"Error in data analysis: {str(e)}")

                        try:
                            print("Creating CSV snippet...")
                            csv_snippet = SummaryFormatter.first_rows_block(df)
                            example_block = (
                                "<example>\n"
                                "INSTRUCTIONS: The CSV snippet shows the first 10 rows of the "
                                "original dataset. Preserve this column order, header names, "
                                "and data types while creating new rows. "
                                "Use this to create a comprehensive list of all columns and their definitions. "
                                "Make sure the list covers all details and columns which will be required "
                                "to create data.\n"
                                f"{csv_snippet}</example>\n"
                            )
                            print("CSV snippet created successfully.")
                        except Exception as e:
                            print(f"Error creating CSV snippet: {str(e)}")
            except Exception as e:
                print(f"Error processing example data: {str(e)}")

        try:
            if example_path:
                final_instruction = f"""You are a brilliant prompt engineer.
                                        Your task: **{custom_prompt}**

                                        {summary_block}{example_block}Return **only** the finished prompt that can be sent directly to a language model.
                                        Now that you have complete information about the task, follow the below instructions to create prompt.

                                        - Look at column list and include all columns in your prompt with their definitions. the list should be exhaustive and cover all columns.
                                        - Make sure to have all statistical analysis , cross-row and cross-column relationships in your prompt.
                                        - The prmpt should be absolutely clear in its final goal and there should not be any ambiguity or vagueness in the prompt.
                                        - The prompt should be clear and exhaustive in its column details.                             

                                    A few examples are given below for your reference 
                                    Code Generation:

                                    {DEFAULT_CODE_GENERATION_PROMPT}

                                    Lending Data Generation:
                                    {LENDING_DATA_PROMPT}

                                Make sure you just give the prompt in your response which can be directly used by large language model.
                                No need to give any explanation but just the prompt in same format as the example given above.
                                Never mention how many rows or dataset size needs to be generated in the final output.

                                    """
            else:
                final_instruction = f"""You are a brilliant prompt engineer.
                                    Your task: **{custom_prompt}**
                                    
                                    {summary_block}{example_block}
                                    
                                    Return a well-crafted prompt that focuses on:
                                    - The core task objective
                                    - Clear and exhaustive column details
                                    - Key aspects to consider or maintain
                                    - Special requirements for the task

                                    A few examples are given below for your reference 
                                    Code Generation:

                                    {DEFAULT_CODE_GENERATION_PROMPT}

                                    Text to SQL:
                                    {DEFAULT_TEXT2SQL_PROMPT}
                
                                    Make sure you just give the prompt in your response which can be directly used by large language model.
                                    No need to give any explanation but just the prompt in same format as the example given above.
                                    Never mention how many rows or dataset size needs to be generated in the final output.
                                    """
        except Exception as e:
            print(f"Error constructing instruction template: {str(e)}")
            final_instruction = f"""You are a brilliant prompt engineer.
                                    Your task: **{custom_prompt}**
                                    
                                    {summary_block}{example_block}
                                    
                                    Return a well-crafted prompt that focuses on:
                                    - The core task objective
                                    - Clear and exhaustive column details
                                    - Key aspects to consider or maintain
                                    - Special requirements for the task

                                    A few examples are given below for your reference 
                                    Code Generation:

                                    {DEFAULT_CODE_GENERATION_PROMPT}

                                    Text to SQL:
                                    {DEFAULT_TEXT2SQL_PROMPT}
                
                                    Make sure you just give the prompt in your response which can be directly used by large language model.
                                    No need to give any explanation but just the prompt in same format as the example given above.
                                    Never mention how many rows or dataset size needs to be generated in the final output.
                                    """

        try:
            family = get_model_family(model_id)
            if family == ModelFamily.LLAMA:
                return "<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n" \
                    f"{final_instruction}\n<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
            elif family == ModelFamily.MISTRAL:
                return f"[INST]\n{final_instruction}\n[/INST]"
            elif family == ModelFamily.CLAUDE:
                return "\n" + final_instruction
            elif family == ModelFamily.QWEN:
                system = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
                return f"""<|im_start|>system
                                    {system}<|im_end|>
                                    <|im_start|>user

                                    {final_instruction}<|im_end|>
                                    <|im_start|>assistant
                                    """
            else:
                return "\n" + final_instruction
        except Exception as e:
            print(f"Error formatting for model family: {str(e)}")
            return final_instruction

        
    
    @staticmethod
    def generate_result_prompt(model_id: str,
        use_case: UseCase,
        input: str,
        examples: List[Example],
        schema = Optional[str],
        custom_prompt = Optional[str]
    ) -> str:
        
                   
        
        examples_str = PromptHandler.get_default_example(use_case, examples)
        #examples_str = PromptHandler.get_default_single_generate_example(use_case, examples)
        
        #print(examples, '\n', examples_str)
        schema_str = PromptHandler.get_default_schema(use_case, schema)
        custom_prompt_str = PromptHandler.get_default_custom_prompt(use_case, custom_prompt)

        base_prompt = f"""You are a very helpful assistant.Observe in the given examples how a soution is provided for a given question.

        <examples>
                {examples_str}
                </examples>
                """
        base_prompt += '\n' + " Now that you have looked at examples you have to follow instructions very carefully and generates response based on those instructions."

        
        base_prompt += custom_prompt_str

        

        if use_case == UseCase.CODE_GENERATION:
            base_prompt += f"""Give a programming solution for following based on the instructions provided above :
                        <input>{input}</input>"""

            
        elif use_case == UseCase.TEXT2SQL:
            base_prompt += f"""Using this database schema:
                            {schema_str}
                            Create  a SQL query for about the following:
                            <input>{input}</input>"""

        elif use_case == UseCase.CUSTOM:
            base_prompt+= f"""Create a solution about the following based on above instructions:
                        <input>{input}</input>""" 
            
        model_family = get_model_family(model_id)
        
        if model_family== ModelFamily.LLAMA:
            
            final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + '\n'  + base_prompt  + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        elif model_family== ModelFamily.MISTRAL:
            system_prompt = "[INST]"
            final_prompt = system_prompt +  "\n" + base_prompt + '\n' +  '[/INST]'

        elif model_family == ModelFamily.CLAUDE:
            final_prompt = base_prompt  
        elif model_family== ModelFamily.QWEN:
            system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
            final_prompt = f'''<|im_start|>system
                                {system_prompt}<|im_end|>
                                <|im_start|>user
                                {base_prompt}
                                <|im_end|>
                                <|im_start|>assistant
                                '''
            
        else:
            final_prompt = base_prompt 
        
        return final_prompt


    @staticmethod
    def get_freeform_prompt(model_id: str,
        use_case: UseCase,
        topic: str,
       num_questions: int,
     omit_questions: List,
        example_custom: Optional[List[Dict[str, Any]]] = None,  # <- now optional
        example_path: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        schema: Optional[str] = None,
    ) -> str:
        
        if example_path:
            try:
                # Use DataLoader to load the file, limiting to 10 rows
                df = DataLoader.load(example_path, sample_rows=10)
                
                # Convert DataFrame to list of dictionaries
                example_upload = df.head(10).to_dict(orient='records')
                
                # Handle non-serializable objects
                def json_serializable(obj):
                    if isinstance(obj, (pd.Timestamp, np.datetime64)):
                        return obj.isoformat()
                    elif isinstance(obj, np.integer):
                        return int(obj)
                    elif isinstance(obj, np.floating):
                        return float(obj)
                    elif isinstance(obj, np.ndarray):
                        return obj.tolist()
                    else:
                        return str(obj)
                
                # Convert to JSON string with custom serialization
                examples_str = json.dumps(example_upload, indent=2, default=json_serializable)
                
            except Exception as e:
                print(f"Error processing example file: {str(e)}")
                examples_str = ""
                
        else:
            if example_custom:
                examples_str = json.dumps(example_custom, indent=2)
        
            else:
                #if use_case == UseCase.CODE_GENERATION or use_case == UseCase.TEXT2SQL or use_case == UseCase.LENDING_DATA:
                examples_str = json.dumps(USE_CASE_CONFIGS[use_case].default_examples)
                
        if custom_prompt is None:
            custom_prompt_default = USE_CASE_CONFIGS[use_case].prompt
        else:
            custom_prompt_default = custom_prompt              
        #custom_prompt_default = PromptHandler.get_freeform_default_custom_prompt(use_case, custom_prompt)
        schema_str = PromptHandler.get_default_schema(use_case, schema)
        if use_case ==UseCase.TEXT2SQL:
            custom_prompt_str = f"""Using this database schema:
                            {schema_str} 
                        Follow below instructions.
                <instructions>{custom_prompt_default}</instructions>"""
        else:
            custom_prompt_str = f"""<instructions>{custom_prompt_default}</instructions>"""

       
        base_prompt = '\n' + "You are a very helpful assistant which creates a valid json array of data based on instructions given" + '\n' 

        # handling duplicates for each topics
        if len(omit_questions)==0:
           omit_prompt =  " "
        else:
            # Join the questions list with newlines and bullet points
            formatted_questions = " | ".join(omit_questions)
            omit_prompt =  """Following is the list of corresponding values for given fields you have already created, 
            For each item you generate, verify it's distinct from others in the current list by comparing key field.Create NEW items that are substantially different.
            """+  "\n"+ formatted_questions
        if examples_str:
            json_instruction = f"""Output MUST be a JSON array with objects in this exact format as described in instructions:
                    
                Requirements:
                    1. MUST be a valid, parseable JSON array
                    2. Each object MUST have exactly same fields as other obejcts based on instructions given by the user.
                    
                    3. Examples for reference:
                    <examples>
                    {examples_str}
                    </examples>
                    4. Format rules:
                    - Use ONLY double quotes (")
                    - Properly escape all special characters
                    - No trailing commas
                    - No text or comments outside the JSON array

                    Return ONLY the JSON array."""
        else:
            json_instruction = f"""Output MUST be a JSON array with objects in this exact format as described in instructions:
                    
                Requirements:
                    1. MUST be a valid, parseable JSON array
                    2. Each object MUST have exactly same fields as other obejcts based on instructions given by the user.
                    3. Format rules:
                    - Use ONLY double quotes (")
                    - Properly escape all special characters
                    - No trailing commas
                    - No text or comments outside the JSON array

                    Return ONLY the JSON array."""

        json_prompt = omit_prompt +  '\n' +  json_instruction

       
        base_prompt += f"""Create {num_questions} set of data about the following topic:
                        <topic>{topic}</topic>
                        based on the instructions provided below """

        
            
        model_family = get_model_family(model_id)
        
        if model_family== ModelFamily.LLAMA:
            
            final_prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + '\n'  + base_prompt + '\n' + custom_prompt_str + '\n' + json_prompt + '\n' + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        elif model_family== ModelFamily.MISTRAL:
            system_prompt = "[INST]"
            final_prompt = system_prompt +  "\n" + base_prompt + '\n' + custom_prompt_str +  '\n'  + json_prompt + '\n'+ '[/INST]'

        elif model_family == ModelFamily.CLAUDE:
            final_prompt = base_prompt + '\n' + custom_prompt_str + "\n" + json_prompt 
        elif model_family== ModelFamily.QWEN:
            system_prompt = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
            
            final_prompt = f'''<|im_start|>system
                                {system_prompt}<|im_end|>
                                <|im_start|>user
                                {base_prompt}
                                {custom_prompt_str}
                                {json_prompt}<|im_end|>
                                <|im_start|>assistant
                                '''
            
        else:
            final_prompt = base_prompt + '\n' + custom_prompt_str + "\n" + json_prompt 
        
        return final_prompt



class PromptBuilder:
    """Builds prompts based on model family, use case, and technique"""
    
    @staticmethod
    def build_prompt(
        model_id: str,
        use_case: UseCase,
        topic: str,
        num_questions: int,
        omit_questions: List,
        examples: List[Example],
        technique: Technique = Technique.SFT,
        schema: Optional[str] = None,
        custom_prompt = Optional[str]
    ) -> str:
       
        
        return ModelPrompts.get_generate_prompt(model_id, use_case, topic, num_questions,omit_questions, examples, technique, schema, custom_prompt)
    
    @staticmethod
    def build_eval_prompt(model_id: str,
        use_case: UseCase,
        question: str,
        solution: str,
        examples: List[EvaluationExample],
        custom_prompt = Optional[str]
    ) -> str:
        
        return ModelPrompts.get_eval_prompt(model_id, use_case,  question, solution, examples,custom_prompt)
    
    @staticmethod
    def build_generate_result_prompt(model_id: str,
        use_case: UseCase,
        input: str,
        examples: List[Example],
        schema = Optional[str],
        custom_prompt = Optional[str]
    ) -> str:
        
        return ModelPrompts.generate_result_prompt(model_id, use_case, input, examples, schema, custom_prompt)
    
    @staticmethod
    def build_custom_prompt(model_id: str,
        custom_prompt = Optional[str],
        example_path= Optional[str],
        example = Optional[List[Dict[str, Any]]]
    ) -> str:
        
        return ModelPrompts.create_custom_prompt(model_id, custom_prompt, example_path, example)
    
    @staticmethod
    def build_freeform_prompt(model_id: str,
        use_case: UseCase,
        topic: str,
        num_questions: int,
        omit_questions: List,
        example_custom: List[Dict[str, Any]],
        example_path: Optional[str],
        custom_prompt = Optional[str],
        schema = Optional[str]
    ) -> str:
        
        return ModelPrompts.get_freeform_prompt(model_id,use_case, topic, num_questions, omit_questions, example_custom, example_path,custom_prompt, schema)
    
    @staticmethod
    def build_freeform_eval_prompt(model_id: str,
        use_case: UseCase,
        row: Dict[str, Any],
        examples: List[EvaluationExample],
        
        custom_prompt = Optional[str]
    ) -> str:
        
        return ModelPrompts.get_freeform_eval_prompt(model_id,use_case, row, examples, custom_prompt)