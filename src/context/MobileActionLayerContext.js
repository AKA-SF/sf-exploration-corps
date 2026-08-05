import { createContext, useContext } from 'react';

const MobileActionLayerContext = createContext(null);

export const MobileActionLayerProvider = MobileActionLayerContext.Provider;

export const useMobileActionLayer = () => useContext(MobileActionLayerContext);
