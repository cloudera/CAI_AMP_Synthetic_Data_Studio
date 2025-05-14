import AssessmentIcon from '@mui/icons-material/Assessment';
import GradingIcon from '@mui/icons-material/Grading';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';


export const nextStepsList = [
    {
        avatar: '',
        title: 'Review Dataset',
        description: 'Review your dataset to ensure it properly fits your usecase.',
        icon: <GradingIcon/>
    },
    {
        avatar: '',
        title: 'Evaluate Dataset',
        description: 'Use an LLM as a judge to evaluate and score your dataset.',
        icon: <AssessmentIcon/>,
    },
    {
        avatar: '',
        title: 'Fine Tuning Studio',
        description: 'Bring your dataset to Fine Tuning Studio AMP to start fine tuning your models in Cloudera AI Workbench.',
        icon: <ModelTrainingIcon/>,
    },
]