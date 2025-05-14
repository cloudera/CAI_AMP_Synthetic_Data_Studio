import React from 'react';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import { getColorCode } from './util';
import { Badge, Table } from 'antd';

interface Props {
    results: unknown;
}

const SeedEvaluateTable: React.FC<Props> = ({ results }) => {
    const result = get(results, 'result');

    if (isEmpty(result)) {
        return null;
    }
    const seeds = Object.values(result);
    const data = [];
    forEach(seeds, (seed: unknown) => {
        const pairs = get(seed, `evaluated_pairs`);
        if (Array.isArray(pairs)) {
            forEach(pairs, (pair: unknown) => {
                data.push({
                    seed,
                    question: get(pair, `question`),
                    solution: get(pair, `solution`),
                    score: get(pair, `evaluation.score`), // justification
                    justification: get(pair, `evaluation.justification`)
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
            render: (question: string) => {
                return <>{question}</>
            }
        },
        {
            title: 'Solution',
            key: 'solution',
            dataIndex: 'solution',
            ellipsis: true,
            render: (solution: string) => <>{solution}</>
        },
        {
            title: 'Score',
            key: 'score',
            dataIndex: 'score',
            width: 100,
            render: (score: number) => {
                return <><Badge count={score} color={getColorCode(score)} showZero /></>
            }
        },
        {
            title: 'Justification',
            key: 'justification',
            dataIndex: 'justification',
            ellipsis: true,
            render: (justification: string) => {
                return <>{justification}</>
            }
        },
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

export default SeedEvaluateTable;
