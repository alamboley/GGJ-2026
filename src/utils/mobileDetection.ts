const MOBILE_BREAKPOINT = 768;

export function isMobile(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function onViewportChange(callback: (isMobile: boolean) => void): () => void {
  let wasMobile = isMobile();

  const handleResize = () => {
    const nowMobile = isMobile();
    if (nowMobile !== wasMobile) {
      wasMobile = nowMobile;
      callback(nowMobile);
    }
  };

  window.addEventListener('resize', handleResize);

  // Handle orientation change with delay for iOS
  const handleOrientationChange = () => {
    setTimeout(handleResize, 100);
  };
  window.addEventListener('orientationchange', handleOrientationChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
  };
}
