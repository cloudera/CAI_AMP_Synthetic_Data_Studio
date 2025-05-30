from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Request, status
import requests
import json
from fastapi.responses import JSONResponse
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv() 

class UseCase(str, Enum):
    CODE_GENERATION = "code_generation"
    TEXT2SQL = "text2sql"
    CUSTOM = "custom"
    LENDING_DATA = "lending_data"

class Technique(str, Enum):
    SFT = "sft"
    DPO = "dpo"
    ORPO = "orpo"
    SPIN = "spin"
    KTO = "kto"

class ModelFamily(str, Enum):
    CLAUDE = "claude"
    LLAMA = "llama"
    MISTRAL = "mistral"
    QWEN = "qwen"

class ModelID(str, Enum):
    CLAUDE_V2 = "anthropic.claude-v2"
    CLAUDE_3 = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    CLAUDE_INSTANT = "anthropic.claude-instant-v1"
    LLAMA_8B = "us.meta.llama3-1-8b-instruct-v1:0"
    LLAMA_70B = "us.meta.llama3-1-70b-instruct-v1:0"
    MISTRAL = "mistral.mixtral-8x7b-instruct-v0:1"

class TopicMetadata(BaseModel):
    """Metadata for each topic"""
    name: str
    description: str
    example_questions: List[Dict[str, str]]

class UseCaseMetadata(BaseModel):
    """Metadata for each use case"""
    name: str
    description: str
    topics: list[str]
    default_examples: List[Dict[str, Any]]
    prompt: Optional[str] = None
    schema: Optional[str] = None


DEFAULT_SQL_SCHEMA = """
CREATE TABLE employees (
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
"""
bedrock_list = ['us.anthropic.claude-3-5-haiku-20241022-v1:0', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
                              'us.anthropic.claude-3-opus-20240229-v1:0','anthropic.claude-instant-v1', 
                              'us.meta.llama3-2-11b-instruct-v1:0','us.meta.llama3-2-90b-instruct-v1:0', 'us.meta.llama3-1-70b-instruct-v1:0', 
                                'mistral.mixtral-8x7b-instruct-v0:1', 'mistral.mistral-large-2402-v1:0',
                                   'mistral.mistral-small-2402-v1:0'  ]

# Detailed use case configurations with examples
USE_CASE_CONFIGS = {
    UseCase.CODE_GENERATION: UseCaseMetadata(
        name="Code Generation",
        description="Generate programming questions and solutions with code examples",
        topics=["Python Basics", "Data Manipulation", "Web Development", "Machine Learning", "Algorithms"],
        default_examples=[
            {
                "question": "How do you read a CSV file into a pandas DataFrame?",
                "solution": "You can use pandas.read_csv(). Here's an example:\n\n```python\nimport pandas as pd\ndf = pd.read_csv('data.csv')\n```"
            },
            {
                "question": "How do you write a function in Python?",
                "solution": "Here's how to define a function:\n\n```python\ndef greet(name):\n    return f'Hello, {name}!'\n\n# Example usage\nresult = greet('Alice')\nprint(result)  # Output: Hello, Alice!\n```"
            }
        ],
        prompt= """
            Requirements:
            - Each solution must include working code examples
            - Include explanations with the code
            - Follow the same format as the examples
            - Ensure code is properly formatted with appropriate indentation
            - Each object MUST have exactly these two fields:
                - "question"
                - "solution"
            """,
        schema=None
    ),

    UseCase.TEXT2SQL: UseCaseMetadata(
        name="Text to SQL",
        description="Generate natural language to SQL query pairs",
        topics=[
            "Basic Queries",
            "Joins",
            "Aggregations",
            "Subqueries",
            "Windows Functions"
        ],
        default_examples=[
            {
                "question": "Find all employees with salary greater than 50000",
                "solution": "```\nSELECT *\nFROM employees\nWHERE salary > 50000;\n```"
            },
            {
                "question": "Get the average salary by department",
                "solution": "```\nSELECT department_id, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department_id;\n```"
            }
        ],
        prompt = """
            Requirements:
            - Each solution must be a working SQL query
            - Include explanations where needed
            - Follow the same format as the examples
            - Ensure queries are properly formatted
            - Each object MUST have exactly these two fields:
                - "question"
                - "solution"
            """,
        schema=DEFAULT_SQL_SCHEMA
    ),

    UseCase.CUSTOM: UseCaseMetadata(
        name="Custom",
        description="Custom use case for user-defined data generation",
        topics=[],
        default_examples=[],
        prompt = " ",
        schema=None
    ),

    UseCase.LENDING_DATA: UseCaseMetadata(
        name="Lending Data",
        description="Generate synthetic lending data",
        topics=['Business loans', 'Personal loans', 'Auto loans', 'Home equity loans', "Asset-backed loans"],
        default_examples=[
            {
                "loan_amnt": 10000.00,
                "term": "36 months",
                "int_rate": 11.44,
                "installment": 329.48,
                "grade": "B",
                "sub_grade": "B4",
                "emp_title": "Marketing",
                "emp_length": "10+ years",
                "home_ownership": "RENT",
                "annual_inc": 117000.00,
                "verification_status": "Not Verified",
                "issue_d": "Jan-2015",
                "loan_status": "Fully Paid",
                "purpose": "vacation",
                "title": "Vacation",
                "dti": 26.24,
                "earliest_cr_line": "Jun-1990",
                "open_acc": 16.00,
                "pub_rec": 0.00,
                "revol_bal": 36369.00,
                "revol_util": 41.80,
                "total_acc": 25.00,
                "initial_list_status": "w",
                "application_type": "INDIVIDUAL",
                "mort_acc": 0.00,
                "pub_rec_bankruptcies": 0.00,
                "address": "0185 Michelle Gateway\r\nMendozaberg, OK 22690"
            },
            {
                "loan_amnt": 8000.00,
                "term": "36 months",
                "int_rate": 11.99,
                "installment": 265.68,
                "grade": "B",
                "sub_grade": "B5",
                "emp_title": "Credit analyst",
                "emp_length": "4 years",
                "home_ownership": "MORTGAGE",
                "annual_inc": 65000.00,
                "verification_status": "Not Verified",
                "issue_d": "Jan-2015",
                "loan_status": "Fully Paid",
                "purpose": "debt_consolidation",
                "title": "Debt consolidation",
                "dti": 22.05,
                "earliest_cr_line": "Jul-2004",
                "open_acc": 17.00,
                "pub_rec": 0.00,
                "revol_bal": 20131.00,
                "revol_util": 53.30,
                "total_acc": 27.00,
                "initial_list_status": "f",
                "application_type": "INDIVIDUAL",
                "mort_acc": 3.00,
                "pub_rec_bankruptcies": 0.00,
                "address": "1040 Carney Fort Apt. 347\r\nLoganmouth, SD 05113"
            },
            {
                "loan_amnt": 15600.00,
                "term": "36 months",
                "int_rate": 10.49,
                "installment": 506.97,
                "grade": "B",
                "sub_grade": "B3",
                "emp_title": "Statistician",
                "emp_length": "< 1 year",
                "home_ownership": "RENT",
                "annual_inc": 43057.00,
                "verification_status": "Source Verified",
                "issue_d": "Feb-2015",
                "loan_status": "Fully Paid",
                "purpose": "credit_card",
                "title": "Credit card refinancing",
                "dti": 12.79,
                "earliest_cr_line": "Aug-2007",
                "open_acc": 13.00,
                "pub_rec": 0.00,
                "revol_bal": 11987.00,
                "revol_util": 92.20,
                "total_acc": 26.00,
                "initial_list_status": "f",
                "application_type": "INDIVIDUAL",
                "mort_acc": 0.00,
                "pub_rec_bankruptcies": 0.00,
                "address": "87000 Mark Dale Apt. 269\r\nNew Sabrina, WV 05113"
            },
            {
                "loan_amnt": 24375.00,
                "term": "60 months",
                "int_rate": 17.27,
                "installment": 609.33,
                "grade": "C",
                "sub_grade": "C5",
                "emp_title": "Destiny Management Inc.",
                "emp_length": "9 years",
                "home_ownership": "MORTGAGE",
                "annual_inc": 55000.00,
                "verification_status": "Verified",
                "issue_d": "Apr-2013",
                "loan_status": "Charged Off",
                "purpose": "credit_card",
                "title": "Credit Card Refinance",
                "dti": 33.95,
                "earliest_cr_line": "Mar-1999",
                "open_acc": 13.00,
                "pub_rec": 0.00,
                "revol_bal": 24584.00,
                "revol_util": 69.80,
                "total_acc": 43.00,
                "initial_list_status": "f",
                "application_type": "INDIVIDUAL",
                "mort_acc": 1.00,
                "pub_rec_bankruptcies": 0.00,
                "address": "512 Luna Roads\r\nGreggshire, VA 11650"
            }
        ],
        prompt = """
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
""",
        schema=None
    )
}

# Model configurations
MODEL_CONFIGS = {
    ModelID.CLAUDE_V2: {"max_tokens": 100000, "max_input_tokens": 100000},
    ModelID.CLAUDE_3: {"max_tokens": 4096, "max_input_tokens": 200000},
    ModelID.CLAUDE_INSTANT: {"max_tokens": 100000, "max_input_tokens": 100000},
    ModelID.LLAMA_8B: {"max_tokens": 4096, "max_input_tokens": 4096},
    ModelID.LLAMA_70B: {"max_tokens": 4096, "max_input_tokens": 4096},
    ModelID.MISTRAL: {"max_tokens": 2048, "max_input_tokens": 2048}
}

def get_model_family(model_id: str) -> ModelFamily:
    if "anthropic.claude" in model_id or "us.anthropic.claude" in model_id:
        return ModelFamily.CLAUDE
    elif "meta.llama" in model_id or "us.meta.llama" in model_id or "meta/llama" in model_id:
        return ModelFamily.LLAMA
    elif "mistral" in model_id or "mistralai/" in model_id:
        return ModelFamily.MISTRAL
    elif 'Qwen' in model_id or 'qwen' in model_id:
        return ModelFamily.QWEN
    else:
        model_name = model_id.split('/')[-1] if '/' in model_id else model_id
        return model_name

def get_available_topics(use_case: UseCase) -> Dict:
    """Get available topics with their metadata for a use case"""
    if use_case not in USE_CASE_CONFIGS:
    
        return {}
    
    
    use_case_config = USE_CASE_CONFIGS[use_case]
    return {
        "use_case": use_case_config.name,
        "description": use_case_config.description,
        "topics": {
            topic_id: {
                "name": metadata.name,
                "description": metadata.description,
                "example_questions": metadata.example_questions
            }
            for topic_id, metadata in use_case_config.topics.items()
        },
        "default_examples": use_case_config.default_examples
    }

def get_examples_for_topic(use_case: UseCase, topic: str) -> List[Dict[str, str]]:
    """Get example questions for a specific topic"""
    use_case_config = USE_CASE_CONFIGS.get(use_case)
    if not use_case_config:
        return []
    
    topic_metadata = use_case_config.topics.get(topic)
    if not topic_metadata:
        return use_case_config.default_examples
    
    return topic_metadata.example_questions


responses = {
    # 4XX Client Errors
    status.HTTP_400_BAD_REQUEST: {
        "description": "Bad Request - Invalid input parameters",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "Invalid input: No topics provided"
                }
            }
        }
    },
    status.HTTP_404_NOT_FOUND: {
        "description": "Resource not found",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "Requested resource not found"
                }
            }
        }
    },
    status.HTTP_422_UNPROCESSABLE_ENTITY: {
        "description": "Validation Error",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "Invalid request parameters"
                }
            }
        }
    },

    # 5XX Server Errors
    status.HTTP_500_INTERNAL_SERVER_ERROR: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "Internal server error occurred"
                }
            }
        }
    },
    status.HTTP_503_SERVICE_UNAVAILABLE: {
        "description": "Service temporarily unavailable",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "The CAII endpoint is downscaled, please try after >15 minutes"
                }
            }
        }
    },
    status.HTTP_504_GATEWAY_TIMEOUT: {
        "description": "Request timed out",
        "content": {
            "application/json": {
                "example": {
                    "status": "failed",
                    "error": "Operation timed out after specified seconds"
                }
            }
        }
    }
}
from pathlib import Path
JWT_PATH = Path("/tmp/jwt")

def _get_caii_token() -> str:
    if (tok := os.getenv("CDP_TOKEN")):
        return tok
    try:
        payload = json.loads(open(JWT_PATH).read())
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No CDP_TOKEN env‑var and no /tmp/jwt file")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Malformed /tmp/jwt")

    if not (tok := payload.get("access_token")):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="access_token missing in /tmp/jwt")
    return tok

def caii_check(endpoint: str, timeout: int = 3) -> requests.Response:
    """
    Return the GET /models response if everything is healthy.
    Raise HTTPException on *any* problem.
    """
    if not endpoint:
        raise HTTPException(400, "CAII endpoint not provided")

    token = _get_caii_token()
    url = endpoint.removesuffix("/chat/completions") + "/models"

    try:
        r = requests.get(url,
                         headers={"Authorization": f"Bearer {token}"},
                         timeout=timeout)
    except requests.exceptions.RequestException as exc:
        raise HTTPException(503, f"CAII endpoint unreachable: {exc}")

    if r.status_code in (401, 403):
        raise HTTPException(403, "Token is valid but has no access to this environment")
    if r.status_code == 404:
        raise HTTPException(404, "CAII endpoint or resource not found")
    if 500 <= r.status_code < 600:
        raise HTTPException(503, "CAII endpoint is downscaled; retry in ~15 min")
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.text)

    return r

LENDING_DATA_PROMPT = """
        Create profile data for the LendingClub company which specialises in lending various types of loans to urban customers.

        Background:
        LendingClub is a peer-to-peer lending platform connecting borrowers with investors. The dataset captures loan applications, 
        borrower profiles, and outcomes to assess credit risk, predict defaults, and determine interest rates. 


        Loan Record field:

        Each generated record must include the following fields in the exact order provided, with values generated as specified:  

        - loan_amnt: The listed amount of the loan applied for by the borrower. If at some point in time, the credit department 
        reduces the loan amount, then it will be reflected in this value.
        - term: The number of payments on the loan. Values are in months and can be either " 36 months" or " 60 months".
        - int_rate: Interest Rate on the loan
        - installment: The monthly payment owed by the borrower if the loan originates.
        - grade: LC assigned loan grade (Possible values: A, B, C, D, E, F, G)
        - sub_grade: LC assigned loan subgrade (Possible sub-values: 1-5 i.e. A5)
        - emp_title: The job title supplied by the Borrower when applying for the loan.
        - emp_length: Employment length in years. Possible values are between 0 and 10 where 0 means less than one year and 10 
        means ten or more years.
        - home_ownership: The home ownership status provided by the borrower during registration or obtained from the credit report.
        Possible values are: RENT, OWN, MORTGAGE, ANY, OTHER
        - annual_inc: The self-reported annual income provided by the borrower during registration.
        - verification_status: Indicates if income was verified by LC, not verified, or if the income source was verified
        - issue_d: The month which the loan was funded
        - loan_status: Current status of the loan (Possible values: "Fully Paid", "Charged Off")
        - purpose: A category provided by the borrower for the loan request.
        - title: The loan title provided by the borrower
        - dti: A ratio calculated using the borrower’s total monthly debt payments on the total debt obligations, excluding mortgage
        and the requested LC loan, divided by the borrower’s self-reported monthly income.
        - earliest_cr_line: The month the borrower's earliest reported credit line was opened
        - open_acc: The number of open credit lines in the borrower's credit file.
        - pub_rec: Number of derogatory public records
        - revol_bal: Total credit revolving balance
        - revol_util: Revolving line utilization rate, or the amount of credit the borrower is using relative to all available 
        revolving credit.
        - total_acc: The total number of credit lines currently in the borrower's credit file
        - initial_list_status: The initial listing status of the loan. Possible values are: w, f
        - application_type: Indicates whether the loan is an individual application or a joint application with two co-borrowers
        - mort_acc: Number of mortgage accounts.
        - pub_rec_bankruptcies: Number of public record bankruptcies
        - address: The physical address of the person

        In addition to the definitions above, when generating samples, adhere to following guidelines:

        Privacy Compliance guidelines:
        1) Ensure PII from examples such as addresses are not used in the generated data to minimize any privacy concerns. 
        2) Avoid real PII in addresses. Use generic street names and cities.  

        Formatting guidelines:
        1) Use consistent decimal precision (e.g., "10000.00" for loan_amnt).  
        2) Dates (e.g. issue_d, earliest_cr_line) should follow the "Jan-YYYY" format.
        3) term has a leading space before the number of months (i.e. " 36 months")
        4) The address field is a special case where the State zipcode needs to be exactly as specified in the seed instructions. 
        The persons address must follow the format as specified in the examples with the State zipcode coming last.
        5) Any other formatting guidelines that can be inferred from the examples or field definitions but are not listed above.

        Cross-row guidelines:
        1) Generated data should maintain consistency with all statistical parameters and distributions defined in the seed instruction
        across records (e.g., 60% of `term` as " 36 months").

        Cross-column guidelines:
        1) Ensure logical and realistic consistency and correlations between variables. Examples include but not limited to:
        a) Grade/Sub-grade consistency: Sub-grade must match the grade (e.g., "B" grade → "B1" to "B5").  
        b) Interest Rate vs Grade/Subgrade relationship: Higher subgrades (e.g., A5) could have higher `int_rate` than lower subgrades (e.g., A3).  
        c) Mortgage Consistency: `mort_acc` should be 1 or more if `home_ownership` is `MORTGAGE`. 
        d) Open Accounts: `open_acc` ≤ `total_acc`.  

        Data distribution guidelines:
        1) Continuous Variables (e.g., `loan_amnt`, `annual_inc`): Adhere to the mean and standard deviation given in the seed 
        instructions for each variable.
        2) Categorical variables (e.g., `term`, `home_ownership`): Use probability distributions given in the seed instructions 
        (e.g. 60% for " 36 months", 40% for " 60 months").
        3) Discrete Variables (e.g., `pub_rec`, `mort_acc`): Adhere to value ranges and statistical parameters
        provided in the seed instructions.
        4) Any other logical data distribution guidelines that can be inferred from the seed instructions or field definitions 
        and are not specified above. 

        Background knowledge and realism guidelines:
        1) Ensure fields such as interest rates reflect real-world interest rates at the time the loan is issued.
        2) Generate values that are plausible (e.g., `annual_inc` ≤ $500,000 for most `emp_length` ranges).  
        3) Avoid unrealistic values (e.g., `revol_util` as "200%" is unrealistic).  
        4) Ensure that the generated data is realistic and plausible, avoiding extreme or impossible values.
        5) Ensure that the generated data is diverse and not repetitive, avoiding identical or very similar records.
        6) Ensure that the generated data is coherent and consistent, avoiding contradictions or inconsistencies between fields.
        7) Ensure that the generated data is relevant to the LendingClub use case and adheres to the guidelines provided."""


