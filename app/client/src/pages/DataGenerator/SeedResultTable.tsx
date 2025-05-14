import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React from 'react';
import { CustomResult } from './types';
import { Table } from 'antd';
import { forEach } from 'lodash';

interface SeedResult {
  [key: string] : CustomResult;  
}


interface Props {
    results: SeedResult[]
}


const SeedResultTable: React.FC<Props> = ({ results }) => {
    if (isEmpty(results)) {
        return null;
    }
    const seeds = Object.keys(results);
    const data = [];
    forEach(seeds, (seed: string) => {
        const pairs = get(results, `${seed}`);
        if (Array.isArray(pairs)) {
            forEach(pairs, (pair: unknown) => {
                data.push({
                    seed,
                    question: get(pair, `question`),
                    solution: get(pair, `solution`)
                });
            })
        }
    })

    const columns = [
        {
            title: 'Question',
            key: 'question',
            dataIndex: 'question',
            ellipsis: true,
            render: (question: string) => <>{question}</>
        },
        {
            title: 'Solution',
            key: 'solution',
            dataIndex: 'solution',
            ellipsis: true,
            render: (solution: string) => <>{solution}</>
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowClassName={() => 'hover-pointer'}
            rowKey={(_record, index) => `seeds-table-${index}`}
            pagination={{
                showSizeChanger: true,
                showQuickJumper: false,
                hideOnSinglePage: true
            }}
        />    
    )
}

export default SeedResultTable;
