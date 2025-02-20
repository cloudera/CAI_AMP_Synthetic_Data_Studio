import { Dataset } from "../../pages/Evaluator/types";

export const datasetTestData: Dataset[] = [
  {
    custom_prompt: 'Prompt 1',
    display_name: 'Dataset 1',
    generate_file_name: 'file1.txt',
    model_id: 'model1',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 1',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 1', 'Topic 2'],
    examples: [],
    schema: null,
    total_count: 100,
    num_questions: 10,
    job_id: 'job1',
    job_name: 'Job 1',
    job_status: 'Completed',
    inference_type: 'Type 1',
    local_export_path: 'path/to/export1',
    output_key: 'key1',
    output_value: 'value1',
    doc_paths: null,
    input_path: null,
    workflow_type: "Code Generation",
    technique: 'Technique 1',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 2',
    display_name: 'Dataset 2',
    generate_file_name: 'file2.txt',
    model_id: 'model2',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 2',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 3', 'Topic 4'],
    examples: [],
    schema: null,
    total_count: 200,
    num_questions: 20,
    job_id: 'job2',
    job_name: 'Job 2',
    job_status: 'Completed',
    inference_type: 'Type 2',
    local_export_path: 'path/to/export2',
    output_key: 'key2',
    output_value: 'value2',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 2',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 3',
    display_name: 'Dataset 3',
    generate_file_name: 'file3.txt',
    model_id: 'model3',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 3',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 5', 'Topic 6'],
    examples: [],
    schema: null,
    total_count: 300,
    num_questions: 30,
    job_id: 'job3',
    job_name: 'Job 3',
    job_status: 'Completed',
    inference_type: 'Type 3',
    local_export_path: 'path/to/export3',
    output_key: 'key3',
    output_value: 'value3',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 3',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 4',
    display_name: 'Dataset 4',
    generate_file_name: 'file4.txt',
    model_id: 'model4',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 4',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 7', 'Topic 8'],
    examples: [],
    schema: null,
    total_count: 400,
    num_questions: 40,
    job_id: 'job4',
    job_name: 'Job 4',
    job_status: 'Completed',
    inference_type: 'Type 4',
    local_export_path: 'path/to/export4',
    output_key: 'key4',
    output_value: 'value4',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 4',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 5',
    display_name: 'Dataset 5',
    generate_file_name: 'file5.txt',
    model_id: 'model5',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 5',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 9', 'Topic 10'],
    examples: [],
    schema: null,
    total_count: 500,
    num_questions: 50,
    job_id: 'job5',
    job_name: 'Job 5',
    job_status: 'Completed',
    inference_type: 'Type 5',
    local_export_path: 'path/to/export5',
    output_key: 'key5',
    output_value: 'value5',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 5',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 6',
    display_name: 'Dataset 6',
    generate_file_name: 'file6.txt',
    model_id: 'model6',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 6',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 11', 'Topic 12'],
    examples: [],
    schema: null,
    total_count: 600,
    num_questions: 60,
    job_id: 'job6',
    job_name: 'Job 6',
    job_status: 'Completed',
    inference_type: 'Type 6',
    local_export_path: 'path/to/export6',
    output_key: 'key6',
    output_value: 'value6',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 6',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 7',
    display_name: 'Dataset 7',
    generate_file_name: 'file7.txt',
    model_id: 'model7',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 7',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 13', 'Topic 14'],
    examples: [],
    schema: null,
    total_count: 700,
    num_questions: 70,
    job_id: 'job7',
    job_name: 'Job 7',
    job_status: 'Completed',
    inference_type: 'Type 7',
    local_export_path: 'path/to/export7',
    output_key: 'key7',
    output_value: 'value7',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 7',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 8',
    display_name: 'Dataset 8',
    generate_file_name: 'file8.txt',
    model_id: 'model8',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 8',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 15', 'Topic 16'],
    examples: [],
    schema: null,
    total_count: 800,
    num_questions: 80,
    job_id: 'job8',
    job_name: 'Job 8',
    job_status: 'Completed',
    inference_type: 'Type 8',
    local_export_path: 'path/to/export8',
    output_key: 'key8',
    output_value: 'value8',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 8',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 9',
    display_name: 'Dataset 9',
    generate_file_name: 'file9.txt',
    model_id: 'model9',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 9',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 17', 'Topic 18'],
    examples: [],
    schema: null,
    total_count: 900,
    num_questions: 90,
    job_id: 'job9',
    job_name: 'Job 9',
    job_status: 'Completed',
    inference_type: 'Type 9',
    local_export_path: 'path/to/export9',
    output_key: 'key9',
    output_value: 'value9',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 9',
    timestamp: new Date('2022-01-01T00:00:00Z')
  },
  {
    custom_prompt: 'Prompt 10',
    display_name: 'Dataset 10',
    generate_file_name: 'file10.txt',
    model_id: 'model10',
    model_parameters: {
      top_k: 10,
      top_p: 0.9,
      temperature: 0.7,
      max_tokens: 100,
      min_p: 0.1
    },
    use_case: 'Use Case 10',
    hf_export_path: null,
    Question_per_topic: 5,
    topics: ['Topic 19', 'Topic 20'],
    examples: [],
    schema: null,
    total_count: 1000,
    num_questions: 100,
    job_id: 'job10',
    job_name: 'Job 10',
    job_status: 'Completed',
    inference_type: 'Type 10',
    local_export_path: 'path/to/export10',
    output_key: 'key10',
    output_value: 'value10',
    doc_paths: null,
    input_path: null,
    workflow_type: 'supervised-fine-tuning',
    technique: 'Technique 10',
    timestamp: new Date('2022-01-01T00:00:00Z')
  }
];