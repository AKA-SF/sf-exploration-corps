import { motion } from 'framer-motion';
import { useEffect } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(5px) hue-rotate(90deg)'
  },
  in: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px) hue-rotate(0deg)',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  out: {
    opacity: 0,
    y: -20,
    filter: 'blur(5px) hue-rotate(-90deg)',
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

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
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className={className}
      style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
