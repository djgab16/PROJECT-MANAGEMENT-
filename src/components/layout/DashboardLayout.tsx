import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const styles = window.getComputedStyle(element);
    return element.getAttribute('aria-hidden') !== 'true'
      && styles.display !== 'none'
      && styles.visibility !== 'hidden'
      && element.getClientRects().length > 0;
  });
}

interface IsolatedElementState {
  element: HTMLElement;
  hadInert: boolean;
  ariaHidden: string | null;
}

export default function DashboardLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
  );

  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(false);
  const wasModalOpenRef = useRef(false);
  const routeKeyRef = useRef(`${location.pathname}${location.search}${location.hash}`);

  const closeDrawer = useCallback(() => {
    restoreFocusOnCloseRef.current = true;
    setIsSidebarOpen(false);
  }, []);

  const openDrawer = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDesktop || isSidebarOpen) return;

    invokerRef.current = event.currentTarget;
    restoreFocusOnCloseRef.current = true;
    setIsSidebarOpen(true);
  }, [isDesktop, isSidebarOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncViewportMode = (matches: boolean) => {
      setIsDesktop(matches);

      if (matches) {
        restoreFocusOnCloseRef.current = false;
        setIsSidebarOpen(false);
        return;
      }

      const activeElement = document.activeElement;
      if (activeElement instanceof Node && drawerRef.current?.contains(activeElement)) {
        window.requestAnimationFrame(() => {
          if (menuButtonRef.current?.isConnected) menuButtonRef.current.focus();
        });
      }
    };

    syncViewportMode(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => syncViewportMode(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}${location.hash}`;
    if (routeKeyRef.current === routeKey) return;

    restoreFocusOnCloseRef.current = true;
    routeKeyRef.current = routeKey;
    const closeFrame = window.requestAnimationFrame(() => setIsSidebarOpen(false));
    return () => window.cancelAnimationFrame(closeFrame);
  }, [location.hash, location.pathname, location.search]);

  const isModalOpen = isSidebarOpen && !isDesktop;

  useEffect(() => {
    if (!isModalOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const body = document.body;
    const previousBodyOverflow = body.style.overflow;
    const isolatedElements = [mobileNavRef.current, mainRef.current]
      .filter((element): element is HTMLElement => element !== null)
      .map<IsolatedElementState>((element) => ({
        element,
        hadInert: element.hasAttribute('inert'),
        ariaHidden: element.getAttribute('aria-hidden'),
      }));

    body.style.overflow = 'hidden';
    isolatedElements.forEach(({ element }) => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });

    const initialFocusFrame = window.requestAnimationFrame(() => {
      if (drawerCloseRef.current?.isConnected) {
        drawerCloseRef.current.focus();
      } else {
        drawer.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(drawer);
      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!drawer.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      body.style.overflow = previousBodyOverflow;
      isolatedElements.forEach(({ element, hadInert, ariaHidden }) => {
        if (!hadInert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
    };
  }, [closeDrawer, isModalOpen]);

  useEffect(() => {
    if (wasModalOpenRef.current && !isModalOpen) {
      const invoker = invokerRef.current;
      const shouldRestoreFocus = restoreFocusOnCloseRef.current;
      invokerRef.current = null;
      restoreFocusOnCloseRef.current = false;

      if (shouldRestoreFocus && invoker?.isConnected) {
        window.requestAnimationFrame(() => {
          if (invoker.isConnected) invoker.focus();
        });
      }
    }

    wasModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  return (
    <div className={`staff-shell dashboard-layout ui-motion ${isSidebarCollapsed ? 'sidebar-collapsed-layout' : ''}`}>
      <div ref={mobileNavRef} className="staff-shell__mobile-nav mobile-top-nav">
        <button
          ref={menuButtonRef}
          type="button"
          className="staff-shell__menu-button icon-btn ui-touch-target ui-touch-target--icon"
          onClick={openDrawer}
          aria-label="Open staff navigation"
          aria-controls="staff-navigation-drawer"
          aria-expanded={isModalOpen}
          aria-haspopup="dialog"
        >
          <Menu size={24} aria-hidden="true" />
        </button>
        <span className="staff-shell__mobile-title mobile-nav-title">SPEEDEX Admin</span>
      </div>

      {isSidebarOpen && (
        <div
          className="staff-shell__backdrop sidebar-overlay"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      <Sidebar
        drawerRef={drawerRef}
        closeButtonRef={drawerCloseRef}
        isMobileDrawer={!isDesktop}
        isOpen={isSidebarOpen}
        onClose={closeDrawer}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
      />

      <main ref={mainRef} className="staff-shell__main dashboard-main" id="staff-route-content">
        <Outlet />
      </main>
    </div>
  );
}
