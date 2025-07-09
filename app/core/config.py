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
    #HOUSING_DATA = "housing_data"
    CREDIT_CARD_DATA = "credit_card_data"
    TICKETING_DATASET = "ticketing_dataset"

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

class UseCaseMetadataEval(BaseModel):
    """Metadata for each use case"""
    name: str
    default_examples: List[Dict[str, Any]]
    prompt: Optional[str] = None
  


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
    ),


    UseCase.CREDIT_CARD_DATA: UseCaseMetadata(
        name="Credit Card Data",
        description="Synthetic data for credit card profile data",
        topics=[
    "High income person",
    "Low income person",
    "Four-person family",
    "Three-person family",
    "Two-person family",
    "Five-person family",
    "more than 10 credit records",
    "more than 20 credit records"

  ],
        default_examples=[
  {
    "ID": 100001,
    "CODE_GENDER": "M",
    "FLAG_OWN_CAR": "Y",
    "FLAG_OWN_REALTY": "Y",
    "CNT_CHILDREN": 2,
    "AMT_INCOME_TOTAL": 85000,
    "NAME_INCOME_TYPE": "Commercial associate",
    "NAME_EDUCATION_TYPE": "Higher education",
    "NAME_FAMILY_STATUS": "Married",
    "NAME_HOUSING_TYPE": "House / apartment",
    "DAYS_BIRTH": -12775,
    "DAYS_EMPLOYED": -2890,
    "FLAG_MOBIL": "Y",
    "FLAG_WORK_PHONE": "Y",
    "FLAG_PHONE": "Y",
    "FLAG_EMAIL": "Y",
    "OCCUPATION_TYPE": "Manager",
    "CNT_FAM_MEMBERS": 4,
    "CREDIT_RECORDS": [
      {"ID": 100001, "MONTHS_BALANCE": -24, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -23, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -22, "STATUS": "1"},
      {"ID": 100001, "MONTHS_BALANCE": -21, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -20, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -19, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -18, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -17, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -16, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -15, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -14, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -13, "STATUS": "1"},
      {"ID": 100001, "MONTHS_BALANCE": -12, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -11, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -10, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -9, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -8, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -7, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -6, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -5, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": -4, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -3, "STATUS": "0"},
      {"ID": 100001, "MONTHS_BALANCE": -2, "STATUS": "1"},
      {"ID": 100001, "MONTHS_BALANCE": -1, "STATUS": "C"},
      {"ID": 100001, "MONTHS_BALANCE": 0, "STATUS": "C"}
    ]
  },
  {
    "ID": 100002,
    "CODE_GENDER": "F",
    "FLAG_OWN_CAR": "N",
    "FLAG_OWN_REALTY": "N",
    "CNT_CHILDREN": 0,
    "AMT_INCOME_TOTAL": 42000,
    "NAME_INCOME_TYPE": "Working",
    "NAME_EDUCATION_TYPE": "Secondary / secondary special",
    "NAME_FAMILY_STATUS": "Single / not married",
    "NAME_HOUSING_TYPE": "Rented apartment",
    "DAYS_BIRTH": -9850,
    "DAYS_EMPLOYED": -1825,
    "FLAG_MOBIL": "Y",
    "FLAG_WORK_PHONE": "N",
    "FLAG_PHONE": "Y",
    "FLAG_EMAIL": "Y",
    "OCCUPATION_TYPE": "Sales staff",
    "CNT_FAM_MEMBERS": 1,
    "CREDIT_RECORDS": [
      {"ID": 100002, "MONTHS_BALANCE": -18, "STATUS": "X"},
      {"ID": 100002, "MONTHS_BALANCE": -17, "STATUS": "X"},
      {"ID": 100002, "MONTHS_BALANCE": -16, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -15, "STATUS": "1"},
      {"ID": 100002, "MONTHS_BALANCE": -14, "STATUS": "2"},
      {"ID": 100002, "MONTHS_BALANCE": -13, "STATUS": "3"},
      {"ID": 100002, "MONTHS_BALANCE": -12, "STATUS": "C"},
      {"ID": 100002, "MONTHS_BALANCE": -11, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -10, "STATUS": "C"},
      {"ID": 100002, "MONTHS_BALANCE": -9, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -8, "STATUS": "1"},
      {"ID": 100002, "MONTHS_BALANCE": -7, "STATUS": "C"},
      {"ID": 100002, "MONTHS_BALANCE": -6, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -5, "STATUS": "C"},
      {"ID": 100002, "MONTHS_BALANCE": -4, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -3, "STATUS": "0"},
      {"ID": 100002, "MONTHS_BALANCE": -2, "STATUS": "1"},
      {"ID": 100002, "MONTHS_BALANCE": -1, "STATUS": "2"},
      {"ID": 100002, "MONTHS_BALANCE": 0, "STATUS": "C"}
    ]
  },
  {
    "ID": 100003,
    "CODE_GENDER": "M",
    "FLAG_OWN_CAR": "Y",
    "FLAG_OWN_REALTY": "Y",
    "CNT_CHILDREN": 1,
    "AMT_INCOME_TOTAL": 95000,
    "NAME_INCOME_TYPE": "State servant",
    "NAME_EDUCATION_TYPE": "Higher education",
    "NAME_FAMILY_STATUS": "Married",
    "NAME_HOUSING_TYPE": "House / apartment",
    "DAYS_BIRTH": -15330,
    "DAYS_EMPLOYED": -4380,
    "FLAG_MOBIL": "Y",
    "FLAG_WORK_PHONE": "Y",
    "FLAG_PHONE": "Y",
    "FLAG_EMAIL": "Y",
    "OCCUPATION_TYPE": "Core staff",
    "CNT_FAM_MEMBERS": 3,
    "CREDIT_RECORDS": [
      {"ID": 100003, "MONTHS_BALANCE": -36, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -35, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -34, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -33, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -32, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -31, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -30, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -29, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -28, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -27, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -26, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -25, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -24, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -23, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -22, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -21, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -20, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -19, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -18, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -17, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -16, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -15, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -14, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -13, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -12, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -11, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -10, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -9, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -8, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -7, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -6, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -5, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -4, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -3, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -2, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": -1, "STATUS": "C"},
      {"ID": 100003, "MONTHS_BALANCE": 0, "STATUS": "C"}
    ]
  },
  {
    "ID": 100004,
    "CODE_GENDER": "F",
    "FLAG_OWN_CAR": "N",
    "FLAG_OWN_REALTY": "N",
    "CNT_CHILDREN": 3,
    "AMT_INCOME_TOTAL": 28000,
    "NAME_INCOME_TYPE": "Pensioner",
    "NAME_EDUCATION_TYPE": "Secondary / secondary special",
    "NAME_FAMILY_STATUS": "Widow/Widower",
    "NAME_HOUSING_TYPE": "Rented apartment",
    "DAYS_BIRTH": -23725,
    "DAYS_EMPLOYED": 365,
    "FLAG_MOBIL": "Y",
    "FLAG_WORK_PHONE": "N",
    "FLAG_PHONE": "N",
    "FLAG_EMAIL": "N",
    "OCCUPATION_TYPE": "Pensioner",
    "CNT_FAM_MEMBERS": 4,
    "CREDIT_RECORDS": [
      {"ID": 100004, "MONTHS_BALANCE": -12, "STATUS": "0"},
      {"ID": 100004, "MONTHS_BALANCE": -11, "STATUS": "1"},
      {"ID": 100004, "MONTHS_BALANCE": -10, "STATUS": "2"},
      {"ID": 100004, "MONTHS_BALANCE": -9, "STATUS": "3"},
      {"ID": 100004, "MONTHS_BALANCE": -8, "STATUS": "4"},
      {"ID": 100004, "MONTHS_BALANCE": -7, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -6, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -5, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -4, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -3, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -2, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": -1, "STATUS": "5"},
      {"ID": 100004, "MONTHS_BALANCE": 0, "STATUS": "X"}
    ]
  }
],
    prompt= """

    Generate synthetic data for a credit card dataset. Here is the context about the dataset:

    Credit score cards are a common risk control method in the financial industry. It uses personal information and data submitted by credit card applicants to predict the probability of future defaults and credit card borrowings. The bank is able to decide whether to issue a credit card to the applicant. Credit scores can objectively quantify the magnitude of risk.
    Generally speaking, credit score cards are based on historical data. Once encountering large economic fluctuations. Past models may lose their original predictive power. Logistic model is a common method for credit scoring. Because Logistic is suitable for binary classification tasks and can calculate the coefficients of each feature. In order to facilitate understanding and operation, the score card will multiply the logistic regression coefficient by a certain value (such as 100) and round it.
    At present, with the development of machine learning algorithms. More predictive methods such as Boosting, Random Forest, and Support Vector Machines have been introduced into credit card scoring. However, these methods often do not have good transparency. It may be difficult to provide customers and regulators with a reason for rejection or acceptance.


    The dataset consists of two tables: `User Records` and `Credit Records`, merged by `ID`. The output must create field values with the following specifications:

    User Records Fields (static per user):
    - ID: Unique client number (e.g., 100001, 100002).
    - CODE_GENDER: Gender ('F' or 'M').
    - FLAG_OWN_CAR: Car ownership ('Y' or 'N').
    - FLAG_OWN_REALTY: Property ownership ('Y' or 'N').
    - CNT_CHILDREN`: Number of children (0 or more).
    - AMT_INCOME_TOTAL`: Annual income.
    - NAME_INCOME_TYPE`: Income category (e.g., 'Commercial associate', 'State servant').
    - NAME_EDUCATION_TYPE`: Education level (e.g., 'Higher education', 'Secondary').
    - NAME_FAMILY_STATUS`: Marital status (e.g., 'Married', 'Single').
    - NAME_HOUSING_TYPE`: Way of living. 
    - DAYS_BIRTH`: Birthday	Count backwards from current day (0), -1 means yesterday.
    - DAYS_EMPLOYED: Start date of employment	Count backwards from current day(0). If positive, it means the person currently unemployed. (negative for employed; positive for unemployed).
    - FLAG_MOBIL: Is there a mobile phone ('Y'/'N')
    - FLAG_WORK_PHONE:	Is there a work phone ('Y'/'N')	
    - FLAG_PHONE: Is there a phone ('Y'/'N')
    - FLAG_EMAIL: Is there an email ('Y'/'N')	
    - OCCUPATION_TYPE: Occupation (e.g., 'Manager', 'Sales staff').
    - CNT_FAM_MEMBERS: Family size (1 or more).

    Credit records Fields (nested array):
    - ID: needs to be the same as the User Records Fields ID.
    - MONTHS_BALANCE: Refers to Record month.	The month of the extracted data is the starting point, backwards, 0 is the current month, -1 is the previous month, and so on.
    - STATUS: 
        Must be one of ['0', '1', '2', '3', '4', '5', 'C', 'X'].
        Values description:	0: 1-29 days past due 1: 30-59 days past due 2: 60-89 days overdue 3: 90-119 days overdue 4: 120-149 days overdue 5: Overdue or bad debts, write-offs for more than 150 days C: paid off that month X: No loan for the month
        

    3. Requirements:
    - Consistency: Ensure `ID` consistency between the application and its nested credit records.
    - Avoid real personal data (use synthetic values).
    - Format output as three separate JSON objects, each with the structure shown in the examples.

    When generating the data, make sure to adhere to the following guidelines:

    Privacy guidelines:
    - Avoid real PII.
    - Ensure examples are not leaked into the synthetic data

    Cross-row entries guidelines (applies to Credit Records):
    - Entries must be ordered from oldest (`MONTHS_BALANCE=-60`) to newest (`MONTHS_BALANCE=0`).  
    - No duplicate `MONTHS_BALANCE` values for a single client.
    - The time-series credit record entries need to be logical and consistent when read in the correct sequence.
    - Ensure there are no other cross-row Credit Records inconsistencies not listed above. 

    Formatting guidelines:
    - `CNT_CHILDREN`, `AMT_INCOME_TOTAL`, `DAYS_BIRTH`, `DAYS_EMPLOYED`, etc., must be integers.  
    - `MONTHS_BALANCE` must be an integer 0 or less.
    - Ensure no other formatting problems or inconsistencies appear that are not listed above. 

    Cross-row entries guidelines (applies to Credit Records):
    - Entries must be ordered from oldest (`MONTHS_BALANCE=-60`) to newest (`MONTHS_BALANCE=0`).  
    - No duplicate `MONTHS_BALANCE` values for a single client.
    - If a Recent `MONTHS_BALANCE` is 0 there  should be an "X" (no loan) or "C" (paid off).  
    - The time-series credit record entries need to be logical and consistent when read in the correct sequence. (e.g. delinquencies can appear in progression as "0" → "1" → "2" as months progress from  "-2" → "-1" → "0"  etc).  
    - Ensure there are no other Credit Records inconsistencies appear that not listed above.


    Cross-Column guidelines:  
    - Check cross-column inconsistencies such as:
        If `FLAG_OWN_REALTY="Y"`, `NAME_HOUSING_TYPE` must **not** be "Rented apartment".  
        If `DAYS_EMPLOYED > 0` (unemployed), `AMT_INCOME_TOTAL` should be lower (e.g., ≤ $50,000).  
        `OCCUPATION_TYPE` must align with `NAME_INCOME_TYPE` (e.g., "Pensioner" cannot have "Manager" as occupation).  
        `CNT_FAM_MEMBERS` ≥ `CNT_CHILDREN` + 1 (accounting for at least one parent).  
    - Ensure there are no other cross-field Credit Records inconsistencies appear that are not listed above.


    """,

        schema=None
    ),

    UseCase.TICKETING_DATASET: UseCaseMetadata(
        name="Ticketing Dataset",
        description= "Synthetic dataset for ticketing system ",
        topics=["Technical Issues", "Billing Queries", "Payment queries"],
        default_examples=[
    {
        "Prompt": "I have received this message that I owe $300 and I was instructed to pay the bill online. I already paid this amount and I am wondering why I received this message.",
        "Completion": "report_payment_issue"
    },
    {
        "Prompt": "I will not be able to attend the presentation and would like to cancel my rsvp.",
        "Completion": "cancel_ticket"
    },
    {
        "Prompt": "I am having questions regarding the exact time, location, and requirements of the event and would like to talk to customer service.",
        "Completion": "Customer_service"
    }
    ]
    ,
        prompt= """
            Generate authentic customer support ticket interactions that have a user query and system response. 
    For each user query, the system generates a keyword that is used to forward the user to the specific subsystem.
    Requirements for user queries:
    - Use professional, respectful language
    - Follow standard customer service best practices
    Each response should be a single id from the following list:
    cancel_ticket,customer_service,report_payment_issue
    Here are the explanations of the responses:
    cancel_ticket means that the customer wants to cancel the ticket.
    customer_service means that customer wants to talk to customer service.
    report_payment_issue means that the customer is facing payment issues and wants to be forwarded to the billing department to resolve the issue. 

            """,
        schema=None
        )
    }



USE_CASE_CONFIGS_EVALS = {
    UseCase.CODE_GENERATION: UseCaseMetadataEval(
        name="Code Generation",
        default_examples=[
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
            ],
        prompt= """Below is a Python coding Question and Solution pair generated by an LLM. Evaluate its quality as a Senior Developer would, considering its suitability for professional use. Use the additive 5-point scoring system described below.

Points are accumulated based on the satisfaction of each criterion:
    1. Add 1 point if the code implements basic functionality and solves the core problem, even if it includes some minor issues or non-optimal approaches.
    2. Add another point if the implementation is generally correct but lacks refinement in style or fails to follow some best practices. It might use inconsistent naming conventions or have occasional inefficiencies.
    3. Award a third point if the code is appropriate for professional use and accurately implements the required functionality. It demonstrates good understanding of Python concepts and common patterns, though it may not be optimal. It resembles the work of a competent developer but may have room for improvement in efficiency or organization.
    4. Grant a fourth point if the code is highly efficient and follows Python best practices, exhibiting consistent style and appropriate documentation. It could be similar to the work of an experienced developer, offering robust error handling, proper type hints, and effective use of built-in features. The result is maintainable, well-structured, and valuable for production use.
    5. Bestow a fifth point if the code is outstanding, demonstrating mastery of Python and software engineering principles. It includes comprehensive error handling, efficient algorithms, proper testing considerations, and excellent documentation. The solution is scalable, performant, and shows attention to edge cases and security considerations.
"""
       
    ),

    UseCase.TEXT2SQL: UseCaseMetadataEval(
        name="Text to SQL",
       
        default_examples=[ {
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
                    ],
        prompt = """Below is a SQL Query Question and Solution pair generated by an LLM. Evaluate its quality as a Senior Database Developer would, considering its suitability for professional use. Use the additive 5-point scoring system described below.

        Points are accumulated based on the satisfaction of each criterion:
            1. Add 1 point if the query retrieves the basic required data, even if it includes some minor issues or non-optimal approaches.
            2. Add another point if the query is generally correct but lacks refinement in style or fails to follow some best practices. It might use inconsistent naming or have occasional inefficiencies.
            3. Award a third point if the query is appropriate for professional use and accurately retrieves the required data. It demonstrates good understanding of SQL concepts and common patterns, though it may not be optimal. It resembles the work of a competent database developer but may have room for improvement in efficiency or organization.
            4. Grant a fourth point if the query is highly efficient and follows SQL best practices, exhibiting consistent style and appropriate commenting. It could be similar to the work of an experienced developer, offering proper indexing considerations, efficient joins, and effective use of SQL features. The result is performant, well-structured, and valuable for production use.
            5. Bestow a fifth point if the query is outstanding, demonstrating mastery of SQL and database principles. It includes optimization for large datasets, proper handling of NULL values, consideration for execution plans, and excellent documentation. The solution is scalable, performs well, and shows attention to edge cases and data integrity.
        """
            ),

    UseCase.CUSTOM: UseCaseMetadataEval(
        name="Custom",
        
        default_examples=[
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
                    ,
        prompt = " ",
        
    ),

    UseCase.LENDING_DATA: UseCaseMetadataEval(
        name="Lending Data",
        
        default_examples=[{
          'score':10,
          'justification': '''
            1. Privacy Compliance: No PII leakage detected. (No deductions).  
            2. Formatting Consistency:  
            - Decimal precision (e.g., "10000.00", "12.05%") is correctly applied.  
            - Dates follow "Jan-YYYY" format.  
            - Term includes a space before the numeric value (e.g., " 36 months").  
            - Zipcode and state alignment adheres to guidelines. (No deductions).  
            3. Cross-Column Consistency:  
            - Grade/Subgrade Alignment: Subgrades (A5, B2, C4) align with their respective grades.  
            - Interest Rate vs. Grade/Subgrade: Rates increase with lower grades (e.g., 12.05% for A5 vs. 18.5% for C4).  
            - Mortgage Consistency: `mort_acc` matches `home_ownership` (e.g., MORTGAGE → `mort_acc=1`, OWN → `mort_acc=0`).  
            - Open vs. Total Accounts: `open_acc` ≤ `total_acc` in all records.  
            - No inconsistencies detected. (No deductions).  
            4. Background Knowledge/Realism:  
            - Interest rates (12–18.5%) align with real-world lending practices at the issuance date.  
            - Loan terms (36/60 months), employment lengths (0–10 years), and DTI ratios (15–25%) are realistic. (No deductions).  
            5. Other Violations: None identified.  

            Final Rating: 10/10. The data adheres to all guidelines, with no critical errors or inconsistencies.
            '''
      }
   ],
        prompt = """

        Evaluate the given data for the LendingClub company which specialises in lending various types of loans to urban customers.

        Background:
        LendingClub is a peer-to-peer lending platform connecting borrowers with investors. The dataset captures loan applications, 
        borrower profiles, and outcomes to assess credit risk, predict defaults, and determine interest rates. 



        Each generated record must include the following defined fields in the exact order provided, with values generated.

        Record Field Definitions:
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




        In addition to the definitions above, when evaluating the data samples, make sure the data adhere to following guidelines:

        Privacy Compliance guidelines:
        1) Allow PII reducted addresses to ensure privacy is maintained. Also, ensure the records address's zipcode and state match the given values in the seed instructions.

        Formatting guidelines:
        1) Check for consistent decimal precision.  
        2) Ensure dates (e.g. issue_d, earliest_cr_line) follow the "Jan-YYYY" format.
        3) Validate that term has space before the number of months (i.e. " 36 months")
        4) State zipcode needs to be exactly as specified in the seed instructions. The persons address must follow the format as specified in the examples with the State zipcode coming last.
        5) Any other formatting guidelines that can be inferred from the examples or field definitions but are not listed above.

        Cross-column guidelines:
        1) Check for logical and realistic consistency and correlations between variables. Examples include but not limited to:
        a) Grade/Sub-grade consistency: Sub-grade must match the grade (e.g., "B" grade → "B1" to "B5" possible subgrades).  
        b) Interest Rate vs Grade/Subgrade relationship: Higher subgrades (e.g., A5) could have higher `int_rate` than lower subgrades (e.g., A3).  
        c) Mortgage Consistency: `mort_acc` should be 1 or more if `home_ownership` is `MORTGAGE`. 
        d) Open Accounts: `open_acc` ≤ `total_acc`.  
        Note: Do not deduct point points based on the installment amount and its relationship with interest rate, loan amount, and term. The relationship has already been verified.

        Data distribution guidelines:
        1) Check if the generated values are statistically possible and within any ranges given the parameters defined in the seed instructions. 

        Background knowledge and realism guidelines:
        1) Ensure fields such as interest rates reflect real-world interest rates at the time the loan is issued.
        2) Check all generated values if they are plausible given real-world background information.



        Scoring Workflow: 
        1. Start at 10 points and deduct points for each violation:  
        - Privacy Compliance: -1 points for any violations related to privacy guidelines.
        - Formatting: -1 point for any violations related to formatting inconsistencies.  
        - Cross-column: -4 points for any violations related to Cross-column inconsistencies.  
        - Background knowledge and realism: -1 point for any violations related to Background knowledge and realism inconsistencies. 
            Note: Allow made-up PII information without deducting points.
        - Other violations: -2 points for any other violations, inconsistencies that you detect but are not listed above.
        2. Cap score at 1 if any critical errors (e.g., PII leakage, missing fields).  
        4. Give a score rating 1-10 for the given data.  If there are more than 9 points to subtract use 1 as the absolute minimum scoring. 
        5. List all scoring justifications as list.
        """
        ),

        UseCase.CREDIT_CARD_DATA: UseCaseMetadataEval(
        name="Crdit Card Data",
        
        default_examples=[
                {
                    "score": 10,
                    "justification": """- No privacy violations detected (no PII leakage).  
        - All fields adhere to formatting requirements (integers where required, valid `MONTHS_BALANCE`, etc.).  
        - Cross-row entries are ordered correctly, no duplicates, and statuses progress logically (e.g., "0" → "1" → "2").  
        - Cross-column consistency:  
        - `FLAG_OWN_REALTY="Y"` aligns with `NAME_HOUSING_TYPE`.  
        - Unemployed (`DAYS_EMPLOYED > 0`) have lower incomes.  
        - `OCCUPATION_TYPE` matches `NAME_INCOME_TYPE`.  
        - `CNT_FAM_MEMBERS` ≥ `CNT_CHILDREN` + 1.  
        - No other critical errors.  
        """

                }
            ],
        prompt = """
        Evaluate the quality of the provided synthetic credit data  and return a score between 1 and 10. The score should reflect how well the data adheres to the following criteria:  

        Here is the context about the dataset:

        Credit score cards are a common risk control method in the financial industry. It uses personal information and data submitted by credit card applicants to predict the probability of future defaults and credit card borrowings. The bank is able to decide whether to issue a credit card to the applicant. Credit scores can objectively quantify the magnitude of risk.
        Generally speaking, credit score cards are based on historical data. Once encountering large economic fluctuations. Past models may lose their original predictive power. Logistic model is a common method for credit scoring. Because Logistic is suitable for binary classification tasks and can calculate the coefficients of each feature. In order to facilitate understanding and operation, the score card will multiply the logistic regression coefficient by a certain value (such as 100) and round it.
        At present, with the development of machine learning algorithms. More predictive methods such as Boosting, Random Forest, and Support Vector Machines have been introduced into credit card scoring. However, these methods often do not have good transparency. It may be difficult to provide customers and regulators with a reason for rejection or acceptance.


        The dataset consists of two tables: `User Records` and `Credit Records`, merged by `ID`. The output must create field values with the following specifications:

        User Records Fields (static per user):
        - ID: Unique client number (e.g., 100001, 100002).
        - CODE_GENDER: Gender ('F' or 'M').
        - FLAG_OWN_CAR: Car ownership ('Y' or 'N').
        - FLAG_OWN_REALTY: Property ownership ('Y' or 'N').
        - CNT_CHILDREN`: Number of children (0 or more).
        - AMT_INCOME_TOTAL`: Annual income.
        - NAME_INCOME_TYPE`: Income category (e.g., 'Commercial associate', 'State servant').
        - NAME_EDUCATION_TYPE`: Education level (e.g., 'Higher education', 'Secondary').
        - NAME_FAMILY_STATUS`: Marital status (e.g., 'Married', 'Single').
        - NAME_HOUSING_TYPE`: Way of living. 
        - DAYS_BIRTH`: Birthday	Count backwards from current day (0), -1 means yesterday.
        - DAYS_EMPLOYED: Start date of employment	Count backwards from current day(0). If positive, it means the person currently unemployed. (negative for employed; positive for unemployed).
        - FLAG_MOBIL: Is there a mobile phone ('Y'/'N')
        - FLAG_WORK_PHONE:	Is there a work phone ('Y'/'N')	
        - FLAG_PHONE: Is there a phone ('Y'/'N')
        - FLAG_EMAIL: Is there an email ('Y'/'N')	
        - OCCUPATION_TYPE: Occupation (e.g., 'Manager', 'Sales staff').
        - CNT_FAM_MEMBERS: Family size (1 or more).

        Credit Records Fields (nested array):
        - ID: needs to be the same as the User Records Fields ID.
        - MONTHS_BALANCE: Refers to Record month.	The month of the extracted data is the starting point, backwards, 0 is the current month, -1 is the previous month, and so on.
        - STATUS: 
            Must be one of ['0', '1', '2', '3', '4', '5', 'C', 'X'].
            Values description:	0: 1-29 days past due 1: 30-59 days past due 2: 60-89 days overdue 3: 90-119 days overdue 4: 120-149 days overdue 5: Overdue or bad debts, write-offs for more than 150 days C: paid off that month X: No loan for the month
            

        Evaluate whether the data adhere to the following guidelines:

        Privacy guidelines:
        - Allow ficticious PII entries that do not leak PII.

        Formatting guidelines:
        - `CNT_CHILDREN`, `AMT_INCOME_TOTAL`, `DAYS_BIRTH`, `DAYS_EMPLOYED`, etc., must be integers.  
        - `MONTHS_BALANCE` must be an integer 0 or less.
        - Ensure no other formatting problems or inconsistencies appear that are not listed above. 

        Cross-row entries guidelines (applies to Credit Records):
        - Entries must be ordered from oldest (e.g. `MONTHS_BALANCE=-60`) to newest (`MONTHS_BALANCE=0`).  
        - No duplicate `MONTHS_BALANCE` values for a single client.
        - Consecutive STATUS=C is allowed since it indicates that each monthly payment and amount owned is paid off.
        - The time-series credit record entries need to be logical and consistent when read in the correct sequence as months progress from negative to 0.
        - Ensure the records dont start from deliquency 2 but rather from 0, C or X.
        - Ensure there are no other Credit Records inconsistencies appear that not listed above.


        Cross-Column guidelines:  
        - Check cross-column inconsistencies such as:
            If `FLAG_OWN_REALTY="Y"`, `NAME_HOUSING_TYPE` must **not** be "Rented apartment".  
            If `DAYS_EMPLOYED > 0` (unemployed), `AMT_INCOME_TOTAL` should be lower (e.g., ≤ $50,000).  
            `OCCUPATION_TYPE` must align with `NAME_INCOME_TYPE` (e.g., "Pensioner" cannot have "Manager" as occupation).  
            `CNT_FAM_MEMBERS` ≥ `CNT_CHILDREN` + 1 (accounting for at least one parent).  
            DAYS_BIRTH, DAYS_EMPLOYED, OCCUPATION_TYPE and other variables are reasonable when considered together. 
        - Ensure there are no other cross-field Credit Records inconsistencies appear that are not listed above.


        Scoring Workflow:
        Start at 10, deduct points for violations:  
        Subtract 2 points for any Privacy guidelines violations.
        Subtract 1 point for any formatting guidelines violations.
        Subtract 1 point for any cross-column violations.
        Subtract 4 points for any Cross-row guidelines guidelines violations.
        Subtract 2 points for any other problem with the generated data not listed above.
        Cap minimum score score at 1 if any critical errors (e.g., missing `ID`, PII, or invalid `STATUS`).  


        Give a score rating 1-10 for the given data.  If there are more than 9 points to subtract use 1 as the absolute minimum scoring. List all justification as list.
        """
        ),
        UseCase.TICKETING_DATASET: UseCaseMetadataEval(
        name="Ticketing Dataset",
        default_examples=[
                {
                    "score": 5,
                    "justification": """
                    The query is professionally written, respectful, and follows customer service best practices.
                    The response 'report_payment_issue' is one of the allowed keywords.
                    The matching between the query and response is perfect according to the provided definitions.

        """},
        {
            "score": 3,
        "justification": """
        The query is professionally written and respectful.
        The response 'cancel_ticket' is one of the allowed keywords.
        While the response uses a valid keyword, it doesn't match the most appropriate category for the specific query content.
        """
        },

            ],
        prompt= """
        You are given a user query for a ticketing support system and the system responses which is a keyword that is used to forward the user to the specific subsystem.
        Evaluate whether the queries:
        - Use professional, respectful language
        - Follow standard customer service best practices
        Evaluate whether the responses use only one of the the following keywords: cancel_ticket,customer_service,report_payment_issue
        Evaluate whether the solutions and responses are correctly matched based on the following definitions:
        cancel_ticket means that the customer wants to cancel the ticket.
        customer_service means that customer wants to talk to customer service.
        report_payment_issue means that the customer is facing payment issues and wants to be forwarded to the billing department to resolve the issue. 
        Give a score of 1-5 based on the following instructions:
        If the responses don’t match the four keywords give always value 1.
        Rate the quality of the queries and responses based on the instructions give a rating between 1 to 5. 

        """
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


