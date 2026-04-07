import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function scrollToTop() {
  // Scroll every possible container to top instantly
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // Also scroll any .main-content div (the patient/doctor shell scroll container)
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;

  const pageContent = document.querySelector('.page-content');
  if (pageContent) pageContent.scrollTop = 0;
}

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(null);

  useLayoutEffect(() => {
    // Disable browser scroll restoration so refresh always lands at top
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Scroll to top immediately on mount (before paint)
    scrollToTop();
    
    // Fallback for slower-loading layout shifts
    const t1 = setTimeout(scrollToTop, 50);
    const t2 = setTimeout(scrollToTop, 150);

    // Trick the browser into saving Y=0 as the scroll position before reload
    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    // Scroll to top on every route change
    if (prevPathname.current !== null && prevPathname.current !== pathname) {
      scrollToTop();
      const t = setTimeout(scrollToTop, 100);
      return () => clearTimeout(t);
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}
