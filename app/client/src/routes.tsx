import { Navigate, createBrowserRouter } from "react-router-dom";
import Layout from "./Container";
import DataGenerator from "./pages/DataGenerator";
import HomePage from "./pages/Home";
import { Pages } from "./types";
import EvaluatorPage from "./pages/Evaluator";
import ReevaluatorPage from "./pages/Evaluator/ReevaluatorPage";
import DatasetDetailsPage from "./pages/DatasetDetails/DatasetDetailsPage";
import WelcomePage from "./pages/Home/WelcomePage";
import ErrorPage from "./pages/ErrorPage";
import EvaluationDetailsPage from "./pages/EvaluationDetails/EvaluationDetailsPage";
//import TelemetryDashboard from "./components/TelemetryDashboard";


const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout/>,
    children: [
      {
        path: '/', // Redirect root to Pages.WELCOME
        element: <Navigate to={Pages.WELCOME} replace />,
      },
      { 
        path: Pages.HOME, 
        element: <HomePage key={Pages.HOME}/>, 
        errorElement: <ErrorPage />,
        loader: async () => null
      },
      { 
        path: Pages.GENERATOR, 
        element: <DataGenerator key={Pages.GENERATOR}/>, 
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