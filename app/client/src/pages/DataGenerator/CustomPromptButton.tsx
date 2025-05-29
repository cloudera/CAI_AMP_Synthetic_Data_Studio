import { Button, Col, Flex, Form, Input, Modal, notification, Row } from "antd";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import { fetchCustomPrompt } from "./hooks";
import Loading from "../Evaluator/Loading";

interface Props {
    model_id: string;
    use_case: string;
    inference_type: string;
    caii_endpoint: string;
    example_path?: string | null;
    setPrompt: (prompt: string) => void
}

export const StyledTextArea = styled(Input.TextArea)`
    margin-bottom: 10px !important;
    height:  100% !important;
    margin-bottom: 10px !important;
    padding: 15px 20px !important;
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    max-height: 90vh;
    // height: 760px;
    height: 85vh;
    width: 750px;
    .ant-modal-body {
      padding-top: 0;
      min-height: 70vh;
      yoverflow-y: auto;
    }
  }
  // .ant-modal-content {
  //       border-radius: 8px;
  //       box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
  //       background-color: #ffffff;
  //       padding: 24px;
  //  }
`        

const StyledFlex = styled(Flex)`
  flex-direction: row-reverse;
`;


const CustomPromptButton: React.FC<Props> = ({ model_id, inference_type, caii_endpoint, use_case, example_path, setPrompt }) => {
  const [form] = Form.useForm();
  const [showModal, setShowModal] = useState(false);

  const mutation = useMutation({
    mutationFn: fetchCustomPrompt
  });

  useEffect(() => {
      if (mutation.isError) {
          notification.error({
            message: 'Error',
            description: `An error occurred while fetching the prompt.\n ${mutation.error}`
          });
      }
      if (mutation.isSuccess) {
        setPrompt(mutation.data as string);
        setShowModal(false);
      }
  }, [mutation.error, mutation.isSuccess]);
  
  const onFinish = async () => {
    const custom_prompt = form.getFieldValue('custom_prompt_instructions');
    try { 

      mutation.mutate({
        model_id,
        inference_type,
        caii_endpoint,
        custom_prompt,
        use_case,
        example_path
      })
    } catch(e) {
      console.error(e);
    }

  }
  const onSubmit = () => {}

  const initialValues = {
    custom_prompt_instructions: null
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)} style={{ marginLeft: '8px' }}>Generate Custom Prompt</Button>
      {showModal && 
        (
            <StyledModal
              visible={showModal}
              okText={`Generate`}
              title={`Generate Custom Prompt`}
              footer={
                <Row>
                  <Col sm={12} />    
                  <Col sm={12}>
                    <StyledFlex key="footer-right">
                      <Button type="primary" style={{ marginLeft: '12px' }} disabled={mutation.isPending} onClick={() => onFinish()}>{'Generate Custom Prompt'}</Button>
                      <Button disabled={mutation.isPending} style={{ marginLeft: '12px' }} onClick={() => setShowModal(false)}>{'Cancel'}</Button>
                    </StyledFlex>
                  </Col>
                </Row>
              }
            >
                <Form 
                    form={form} 
                    layout="vertical" 
                    initialValues={initialValues} 
                    onFinish={onSubmit}
                    style={{ marginTop: '24px' }}
                    disabled={mutation.isPending}
                >
                    {mutation.isPending && 
                      <Flex justify='center' align='center' style={{ marginBottom: '16px' }}>
                        <Loading />
                      </Flex>
                    }

                    <Form.Item
                        name='custom_prompt_instructions'
                        label='Custom Prompt Instructions'
                        rules={[{ required: true, message: "This field is required." }]}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <StyledTextArea
                            disabled={mutation.isPending} 
                            rows={15}
                            autoSize 
                            placeholder={'Enter instructions for a custom prompt'}
                        />
                    </Form.Item>
                </Form>

            </StyledModal>
        )
      }
    </>
  );    
}

export default CustomPromptButton;