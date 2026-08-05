import { createPortal } from 'react-dom';
import { useMobileActionLayer } from '../../context/MobileActionLayerContext';
import LogSubmitActionBar from './LogSubmitActionBar';

const MobileLogSubmitPortal = props => {
  const portalTarget = useMobileActionLayer();

  if (!portalTarget) return null;

  return createPortal(
    <LogSubmitActionBar {...props} className="mobile-log-submit-bar" />,
    portalTarget,
  );
};

export default MobileLogSubmitPortal;
