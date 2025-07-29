import { Navigate, createBrowserRouter } from "react-router-dom";
import Layout from "./Container";
import DataGenerator from "./pages/DataGenerator";
import HomePage from "./pages/Home";
import { Pages, WizardModeType } from "./types";
import EvaluatorPage from "./pages/Evaluator";
import ReevaluatorPage from "./pages/Evaluator/ReevaluatorPage";
import DatasetDetailsPage from "./pages/DatasetDetails/DatasetDetailsPage";
import WelcomePage from "./pages/Home/WelcomePage";
import ErrorPage from "./pages/ErrorPage";
import EvaluationDetailsPage from "./pages/EvaluationDetails/EvaluationDetailsPage";
import DatasetsPage from "./pages/Datasets/DatasetsPage";
import EvaluationsPage from "./pages/Evaluations/EvaluationsPage";
import ExportsPage from "./pages/Exports/ExportsPage";
//import TelemetryDashboard from "./components/TelemetryDashboard";


const isWelcomePageMuted = () => {
  return  window.localStorage.getItem('sds_mute_welcome_page') === 'true';
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout/>,
    children: [
      {
        path: '/', // Redirect root to Pages.WELCOME
        element: isWelcomePageMuted() ? <HomePage key={Pages.HOME}/> :
        <Navigate to={Pages.WELCOME} replace />,
        errorElement: <ErrorPage />
      },
      { 
        path: Pages.HOME, 
        element: <HomePage key={Pages.HOME}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.GENERATOR, 
        element: <DataGenerator key={Pages.GENERATOR} mode={WizardModeType.DATA_GENERATION}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: `${Pages.GENERATOR}/:template_name`, 
        element: <DataGenerator key={Pages.GENERATOR}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.DATA_AUGMENTATION, 
        element: <DataGenerator key={Pages.DATA_AUGMENTATION} mode={WizardModeType.DATA_AUGMENTATION}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.DATASETS, 
        element: <DatasetsPage key={Pages.GENERATOR} />, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.EVALUATIONS, 
        element: <EvaluationsPage key={Pages.EVALUATIONS} />, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.EXPORTS, 
        element: <ExportsPage key={Pages.EXPORTS} />, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: `${Pages.REGENERATE}/:generate_file_name`, 
        element: <DataGenerator key={Pages.GENERATOR}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      {
        path: `${Pages.EVALUATOR}/create/:generate_file_name`,
        element: <EvaluatorPage />,
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      {
        path: `${Pages.EVALUATOR}/reevaluate/:evaluate_file_name`,
        element: <ReevaluatorPage />,
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      {
        path: `dataset/:generate_file_name`,
        element: <DatasetDetailsPage />,
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      {
        path: `evaluation/:evaluate_file_name`,
        element: <EvaluationDetailsPage />,
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      {
        path: `welcome`,
        element: <WelcomePage />,
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      // {
      //   path: `telemetry`,
      //   element: <TelemetryDashboard />,
      //   errorElement: <ErrorPage />,
      //   loader: async () => null
      // }
    ]
  },
]);


export default router;