import { FC, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * 
 * @param element: React el to render if validator returns true
 * @param validator: Cb func called with useLocation.state 
 * @param reroutePath: path to redirect if validator returns false 
 * @returns 
 */
interface RouteACProps{
  element: ReactNode;
  validator: (state: unknown | null) => boolean;
  reroutePath?: string;
}
const RouteAccessControl: FC<RouteACProps> = ({ element, validator, reroutePath = '/' }) => {
    const location = useLocation();
    const state = location.state;
    if (state && validator(state)) {
      return element
    }
    return <Navigate to={reroutePath} state={{ from: location }} replace />;
};
  
export default RouteAccessControl;

