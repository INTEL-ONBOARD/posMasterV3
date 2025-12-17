import { createContext } from 'react';

const ToastContext = createContext({
  open: () => {},
  close: () => {},
});

export default ToastContext;