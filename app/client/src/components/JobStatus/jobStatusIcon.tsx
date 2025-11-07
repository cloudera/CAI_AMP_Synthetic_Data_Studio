import { Tooltip } from "antd";
import { CheckCircleTwoTone, ExclamationCircleTwoTone, InfoCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { JobStatus } from "../../types";
import styled from "styled-components";

export type JobStatusProps = {
    status: JobStatus
    customTooltipTitles?: Partial<Record<JobStatus, string>>
}

const defaultTooltipTitles: Record<JobStatus, string> = {
    'ENGINE_SUCCEEDED': 'Success!',
    'ENGINE_STOPPED': 'Error!',
    'ENGINE_TIMEDOUT': 'Job timeout!',
    'ENGINE_SCHEDULING': 'Scheduling!',
    'ENGINE_RUNNING': 'Engine running!',
    'default': 'Check the job in the application!',
    'null': 'No job was executed'
}

const IconWrapper = styled.div`
    svg {
        font-size: 20px;
    }
`

const StyledIconWrapper = styled(IconWrapper)`
    svg {
        color: #008cff;
    }
`;


export default function JobStatusIcon({ status, customTooltipTitles }: JobStatusProps) {
    const tooltipTitles = {...defaultTooltipTitles, ...customTooltipTitles};

    function jobStatus() {
        switch (status) {
            case "ENGINE_SUCCEEDED":
                return <Tooltip title={tooltipTitles.ENGINE_SUCCEEDED}>
                    <IconWrapper><CheckCircleTwoTone twoToneColor="#52c41a" /></IconWrapper>
                </Tooltip>;
            case 'ENGINE_STOPPED':
                return <Tooltip title={tooltipTitles.ENGINE_STOPPED}>
                    <IconWrapper><ExclamationCircleTwoTone twoToneColor="red" /></IconWrapper>
                    </Tooltip>;
            case 'ENGINE_TIMEDOUT':
                return <Tooltip title={tooltipTitles.ENGINE_TIMEDOUT}>
                    <IconWrapper><ExclamationCircleTwoTone twoToneColor="red" /></IconWrapper>
                    </Tooltip>;
            case 'ENGINE_SCHEDULING':
                return <Tooltip title={tooltipTitles.ENGINE_SCHEDULING}>
                    <StyledIconWrapper><LoadingOutlined spin/></StyledIconWrapper>
                    </Tooltip>;
            case 'ENGINE_RUNNING':
                return <Tooltip title={tooltipTitles.ENGINE_RUNNING}>
                    <StyledIconWrapper><LoadingOutlined spin /></StyledIconWrapper>
                    </Tooltip>;
            case null:
                return <Tooltip title={tooltipTitles.null}>
                    <IconWrapper><CheckCircleTwoTone twoToneColor="#52c41a" /></IconWrapper>
                    </Tooltip>;
            default:
                return <Tooltip title={tooltipTitles.default}>
                    <IconWrapper><InfoCircleTwoTone /></IconWrapper>
                    </Tooltip>;
        }
    }

    return jobStatus();
}