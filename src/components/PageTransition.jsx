import { useEffect } from 'react';

const PageTransition = ({ children, className = '' }) => {
  useEffect(() => {
    // Scroll to top of window and page container on route change
    window.scrollTo(0, 0);
    const container = document.querySelector('.page-container');
    const mobileContainer = document.querySelector('.mobile-container');
    if (container) container.scrollTop = 0;
    if (mobileContainer) mobileContainer.scrollTop = 0;
  }, []);

  return (
    <div className={`page-transition ${className}`}>
      {children}
    </div>
  );
};

export default PageTransition;
