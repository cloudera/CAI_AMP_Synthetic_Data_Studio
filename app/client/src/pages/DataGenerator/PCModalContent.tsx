import { Button, Flex, Form, Input, Modal, Typography } from 'antd';
import styled from 'styled-components';

import Markdown from '../../components/Markdown';
import TooltipIcon from '../../components/TooltipIcon';
import { QuestionSolution } from './types';

const { Title } = Typography;
const Container = styled(Flex)`
    margin-top: 15px
`
const StyledFormItem = styled(Form.Item)`
    margin-bottom: 0;
`;
const StyledTitle = styled(Title)`
    margin-top: 0;
    margin-bottom: 0 !important;
`;
const TitleGroup = styled(Flex)`
    margin-top: 10px;
    margin-bottom: 10px;
`
const PromptInput = styled(Input.TextArea)`
    min-height: 150px !important;
    resize: none !important;
`
const CompletionInput = styled(Input.TextArea)`
    min-height: 300px !important;
    resize: none !important;
`

/**
 * Modal Content for prompts and completions
 */
const PCModalContent = ({ 
    question = '', 
    solution = '', 
    onSubmit = (data: QuestionSolution)=>{}, readOnly = true }
) => {
    const [form] = Form.useForm();
    
    return (
        <Form form={form} onFinish={(data: QuestionSolution) => onSubmit(data)}>
            { readOnly ? (
                <Container gap={10} vertical>
                    {question && (
                        <div>
                            <TitleGroup align='center' gap={5}>
                                <StyledTitle level={5}>{'Prompt'}</StyledTitle>
                                <TooltipIcon message={'Examples prompt help message'} size={14}/>
                            </TitleGroup>
                            <Markdown text={question} />
                        </div>
                    )}
                    {solution && (
                        <div>
                            <TitleGroup align='center' gap={5}>
                                <StyledTitle level={5}>{'Completion'}</StyledTitle>
                                <TooltipIcon message={'Examples completion help message'} size={14}/>
                            </TitleGroup>
                            <Markdown text={solution} />
                        </div>
                    )}
                </Container>
            ): (
                <Container gap={15} vertical>
                    <div>
                    <TitleGroup align='center' gap={5}>
                        <StyledTitle level={5}>{'Prompt'}</StyledTitle>
                        <TooltipIcon message={'Examples prompt help message'} size={14}/>
                    </TitleGroup>
                    <StyledFormItem
                        name='question'
                        initialValue={question}
                        rules={[
                            { required: true, message: 'Please enter a prompt' }
                        ]}
                    >
                        <PromptInput placeholder={'Enter a prompt'}/>
                    </StyledFormItem>
                </div>
                <div>
                    <TitleGroup align='center' gap={5}>
                        <StyledTitle level={5}>{'Completion'}</StyledTitle>
                        <TooltipIcon message={'Examples completion help message'} size={14}/>
                    </TitleGroup>
                    <Form.Item
                        name='solution'
                        initialValue={solution}
                        rules={[
                            { required: true, message: 'Please enter a completion' }
                        ]}
                    >
                        <CompletionInput placeholder={'Enter a completion'}/>
                    </Form.Item>
                    <Flex gap={10} justify='end'>
                        <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                        <Form.Item >
                            <Button htmlType='submit' type='primary'>{'Save'}</Button>
                        </Form.Item>
                    </Flex>

                </div>
            </Container>
            )}
        </Form>
    )
}

export default PCModalContent;