import { Descriptions, Flex, Form, Input, List, Modal, Table, Typography } from 'antd';
import styled from 'styled-components';
import isEmpty from 'lodash/isEmpty';
import Markdown from '../../components/Markdown';
import PCModalContent from './PCModalContent'
import { MODEL_PROVIDER_LABELS } from './constants'
import { ModelParameters } from '../../types';
import { ModelProviders, QuestionSolution, Usecases } from './types';
import FreeFormExampleTable from './FreeFormExampleTable';
const { Title } = Typography;

const MODEL_PARAMETER_LABELS: Record<ModelParameters, string> = {
    [ModelParameters.TOP_K]: 'Top K',
    [ModelParameters.TOP_P]: 'Top P',
    [ModelParameters.MIN_P]: 'Min P',
    [ModelParameters.TEMPERATURE]: 'Temperature',
    [ModelParameters.MAX_TOKENS]: 'Max Tokens',
};

const MarkdownWrapper = styled.div`
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 4px 11px;
`;

const StyledTable = styled(Table)`
    .ant-table-row {
        cursor: pointer;
    }
`

const StyledTextArea = styled(Input.TextArea)`
    color: #575757 !important;
    background: #fafafa !important;
    width: auto;
    min-width: 800px;
}
`;

const Summary= () => {
    const form = Form.useFormInstance()
    const {
        display_name,
        use_case,
        inference_type,
        model_id,
        num_questions,
        custom_prompt,
        model_parameters,
        workflow_type,
        topics = [],
        schema,
        examples = []
    } = form.getFieldsValue(true);

    const cfgStepDataSource = [
        { label: 'Dataset Name', children: display_name },
        { label: 'Usecase', children: use_case },
        { label: 'Model Provider', children: MODEL_PROVIDER_LABELS[inference_type as ModelProviders] },
        { label: 'Model Name', children: model_id },
        { label: 'Data Count', children: num_questions },
        { label: 'Total Dataset Size', children: topics === null ? num_questions : num_questions * topics.length },
    ];
    const exampleCols = [
        {
            title: 'Prompts',
            dataIndex: 'prompts',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.question}</>
        },
        {
            title: 'Completions',
            dataIndex: 'completions',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.solution}</>
        },
    ];

    return (
        <Flex gap={20} vertical>
            <div>
                <Title level={4}>{'Settings'}</Title>
                <Descriptions
                    bordered
                    colon
                    column={1}
                    items={cfgStepDataSource}
                    style={{ maxWidth: 800}}
                />
            </div>
            <div>
                <Title level={4}>{'Prompt'}</Title>
                <StyledTextArea autoSize disabled value={custom_prompt}/>
                {/* <MarkdownWrapper>
                    <Markdown text={custom_prompt}/>
                </MarkdownWrapper> */}
            </div>
            <div>
                <Title level={4}>{'Parameters'}</Title>
                <Descriptions
                    bordered
                    colon
                    column={1}
                    items={Object.keys(model_parameters).map((param, i: number) => {
                        return {
                            key: `${param}-${i}`,
                            label: MODEL_PARAMETER_LABELS[param as ModelParameters],
                            children: model_parameters[param]
                        }
                    })}
                    size='small'
                    style={{ maxWidth: 400}}
                />
            </div>
            {isEmpty(topics) && 
            <div>
                <Title level={4}>{'Seed Instructions'}</Title>
                <List
                    dataSource={topics || []}
                    renderItem={(item: string) => (<List.Item>{item}</List.Item>)}
                    locale={{
                        emptyText: (
                            <Flex justify='start'>
                                {'No seed instructions were selected'}
                            </Flex>
                        )
                    }}
                />
            </div>}
            {(schema && use_case === Usecases.TEXT2SQL) && (
                <div>
                    <Title level={4}>{'DB Schema'}</Title>
                    <MarkdownWrapper>
                        <Markdown text={schema}/>
                    </MarkdownWrapper>
                </div>
            )}
            {!isEmpty(examples) && 
              <div>
                <Title level={4}>{'Examples'}</Title>
                {workflow_type === 'freeform' ?
                <FreeFormExampleTable  data={examples} /> :
                <StyledTable
                    bordered
                    columns={exampleCols}
                    dataSource={examples}
                    pagination={false}
                    onRow={(record,) => ({
                        onClick: () => Modal.info({ 
                            title: 'View Details',
                            content: <PCModalContent {...record}/>,
                            icon: undefined,
                            maskClosable: true,
                            width: 1000
                        })
                    })}
                    rowKey={(_record, index) => `summary-examples-table-${index}`}
                />}
            </div>}
        </Flex>
    )
}

export default Summary;