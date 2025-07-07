# app/migrations/alembic_schema_models.py
from sqlalchemy import create_engine, Column, Integer, Text, Float, MetaData
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class GenerationMetadataModel(Base):
    __tablename__ = 'generation_metadata'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(Text)
    technique = Column(Text)
    model_id = Column(Text)
    inference_type = Column(Text)
    caii_endpoint = Column(Text)
    use_case = Column(Text)
    custom_prompt = Column(Text)
    model_parameters = Column(Text)
    input_key = Column(Text)
    output_key = Column(Text)
    output_value = Column(Text)
    generate_file_name = Column(Text, unique=True)
    display_name = Column(Text)
    local_export_path = Column(Text)
    hf_export_path = Column(Text)
    s3_export_path = Column(Text) 
    num_questions = Column(Float)
    total_count = Column(Float)
    topics = Column(Text)
    examples = Column(Text)
    schema = Column(Text)
    doc_paths = Column(Text)
    input_path = Column(Text)
    job_id = Column(Text)
    job_name = Column(Text, unique=True)
    job_status = Column(Text)
    job_creator_name = Column(Text)
    completed_rows = Column(Integer)

class EvaluationMetadataModel(Base):
    __tablename__ = 'evaluation_metadata'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(Text)
    model_id = Column(Text)
    inference_type = Column(Text)
    caii_endpoint = Column(Text)
    use_case = Column(Text)
    custom_prompt = Column(Text)
    model_parameters = Column(Text)
    generate_file_name = Column(Text)
    evaluate_file_name = Column(Text, unique=True)
    display_name = Column(Text)
    local_export_path = Column(Text)
    examples = Column(Text)
    average_score = Column(Float)
    job_id = Column(Text)
    job_name = Column(Text, unique=True)
    job_status = Column(Text)
    job_creator_name = Column(Text)

class ExportMetadataModel(Base):
    __tablename__ = 'export_metadata'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(Text)
    display_export_name = Column(Text)
    display_name = Column(Text)
    local_export_path = Column(Text)
    hf_export_path = Column(Text)
    s3_export_path = Column(Text) 
    job_id = Column(Text)
    job_name = Column(Text, unique=True)
    job_status = Column(Text)
    job_creator_name = Column(Text)

class TestMetadataModel(Base):
    __tablename__ = 'test_metadata'
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(Text)
    display_name = Column(Text)
    