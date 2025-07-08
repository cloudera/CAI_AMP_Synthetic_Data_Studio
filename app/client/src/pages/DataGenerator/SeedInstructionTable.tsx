import { Button, Flex, FormInstance, Table } from 'antd';
import React, { FunctionComponent, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';



interface Props {
    topics: string[];
    selelectedTopics: string[];
    form: FormInstance;
}

const StyledTable = styled(Table)`
    .ant-table-thead { display: none; }
    // .ant-table-thead > tr > th {
    //     background-color: #f0f2f5;
    //     color: #000;
    //     font-weight: 500;
    // }
`;


const SeedInstructionTable: FunctionComponent<Props> = ({ selelectedTopics, form }) => {
    const [dataSource, setDataSource] = useState<Record<string, string>[]>([]);

    useEffect(() => {
        if (selelectedTopics.length > 0) {
            const _datqasource = selelectedTopics.map((item) => ({
                name: item,
                label: item
            }));
            setDataSource(_datqasource);
        }
    }, [selelectedTopics, form]);

    const columns = [
        {
            dataIndex: 'label',
            key: 'label',
            width: 450,
        },
        {
            dataIndex: 'label',
            key: 'label',
            width: 10,
            render: (row: any) => (
                <Flex>
                    <Button icon={<EditOutlined />} type="link" onClick={() => {
                        console.log('Edit clicked for:', row);
                    }} />
                    <Button icon={<DeleteOutlined />} type="link" danger onClick={() => {
                        console.log('Delete clicked for:', row);
                    }} style={{ marginLeft: '8px' }} />     
                </Flex>
            )
        }
    ]; 

    return (
        <>
            <StyledTable columns={columns} dataSource={dataSource}/>
        </>
    );
}

export default SeedInstructionTable;