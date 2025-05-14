import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import Markdown from '../../components/Markdown';
import TooltipIcon from '../../components/TooltipIcon';


const { Title } = Typography;

interface Props {
    question: string;
    solution: string;
}


const Container = styled(Flex)`
    margin-top: 15px
`

const StyledTitle = styled(Title)`
    margin-top: 0;
    margin-bottom: 0 !important;
`;
const TitleGroup = styled(Flex)`
    margin-top: 10px;
    margin-bottom: 10px;
`;

const ExampleModal: React.FC<Props> = ({ question, solution }) => {
    return (
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
    )
}

export default ExampleModal;