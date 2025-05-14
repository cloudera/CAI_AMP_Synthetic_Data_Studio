import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ModelParameters } from '../../types';
import { Button, Form, FormInstance, Result } from 'antd';
import { useGetDataset, useModels } from './hooks';
import EvaluateDataset from './EvaluateDataset';
import EvaluatorSuccess from './EvaluatorSuccess';
import { ViewType } from './types';

const BASE_API_URL = import.meta.env.VITE_AMP_URL;


const EvaluatorPage: React.FC = () => {
  const [form] = Form.useForm<FormInstance>();
  const { generate_file_name } = useParams();
  const [viewType, setViewType] = useState<ViewType>(ViewType.EVALUATE_F0RM)
  const [ errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); 
  const [evaluateResult, setEvaluateResult] = useState(null);
  const { dataset, prompt, examples } = useGetDataset(generate_file_name as string);
  const modelsReq = useModels();
  const modelsMap = get(modelsReq, 'modelsMap', {});
  const model_inference_type = get(dataset, 'inference_type');
  const models = get(modelsReq, `data.models.${model_inference_type}`, []);

  useEffect(() => {
      if (!isEmpty(dataset)) {
        setTimeout(() => {
        const parameters: ModelParameters = get(dataset, 'model_parameters');
        const values = form.getFieldsValue();
        form.setFieldsValue({
          ...values,
          custom_prompt: prompt || '',
          top_p: get(parameters, 'top_p'),
          top_k: get(parameters, 'top_k'),
          min_p: get(parameters, 'min_p'),
          max_tokens: get(parameters, 'max_tokens'),
          temperature: get(parameters, 'temperature'),
          model_id: get(dataset, 'model_id'),
          inference_type: get(dataset, 'inference_type'),
          model_parameters: parameters
        })
      }, 500);
      }
    }, [dataset]);

// const mutation = useMutation(async (formData) => {
//       const response = await fetch(`${BASE_API_URL}/synthesis/evaluate`, {
//         method: 'POST',
//         body: JSON.stringify(formData),
//       });
//       return response.json();
//     });

const evaluateDataset = async (formData: unknown) => {
      const url = dataset.technique === 'freeforms' ? 
        `${BASE_API_URL}/synthesis/evaluate` : `${BASE_API_URL}/synthesis/evaluate_freeform`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      return response.json();
    }

const onSubmit = async () => {
      const values = form.getFieldsValue();
      try {
        await form.validateFields();
      } catch(e) {
        console.error(e);
        return;
      }
      
      const formData = {
        ...values,
        export_type: 'local',
        import_type: 'local',
        import_path: generate_file_name,
        is_demo: dataset.total_count > 25 ? false : true,
        use_case: get(dataset, 'use_case'),
        model_params: values?.model_parameters
      }
      
      try {
        setLoading(true);
        const resp = await evaluateDataset(formData);
        if (!isEmpty(resp.status) && resp.status === 'failed') {
          setErrorMessage(resp.error || resp.message);
        }
        setLoading(false);
        if (resp.output_path || resp.job_name) {
          setEvaluateResult(resp);
        }
        setViewType(ViewType.SUCCESS_VIEW);
      
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    if (errorMessage) {
      return (
          <>
              <Result
                  status="error"
                  title="Dataet Evaluation Failed"
                  subTitle={errorMessage}
                  extra={
                      <Button type="primary" href={`/evaluator/create/${generate_file_name}`}>
                          {'Start Over'}
                      </Button>
                  }
              />
          </>
      )
    }
    
    return (
      <>
        {viewType === ViewType.EVALUATE_F0RM && 
          <EvaluateDataset 
            form={form} 
            onEvaluate={onSubmit} 
            models={models} 
            dataset={dataset} 
            examples={examples}
            modelsMap={modelsMap} 
            viewType={viewType}
            loading={loading} 
          />}
        {viewType === ViewType.SUCCESS_VIEW && 
          <EvaluatorSuccess 
            dataset={dataset}
            result={evaluateResult}
            demo={get(dataset, 'total_count', 0) <= 25} />}
      </>
    )
}

export default EvaluatorPage;