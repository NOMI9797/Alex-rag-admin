/**
 * Next.js instrumentation for global error handling
 * This file runs once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Handle unhandled promise rejections (like MongoDB DNS errors)
    process.on('unhandledRejection', (reason: any, promise) => {
      // Suppress MongoDB DNS errors (ESERVFAIL, ETIMEOUT) - these are transient and auto-retry
      if ((reason?.code === 'ESERVFAIL' || reason?.code === 'ETIMEOUT') && 
          (reason?.syscall === 'querySrv' || reason?.syscall === 'queryTxt')) {
        // These are transient DNS issues, MongoDB driver will retry automatically
        // No need to log them as errors
        return;
      }
      
      // Log other unhandled rejections
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: any) => {
      // Suppress MongoDB DNS errors (ESERVFAIL, ETIMEOUT) - these are transient and auto-retry
      if ((error.code === 'ESERVFAIL' || error.code === 'ETIMEOUT') && 
          (error.syscall === 'querySrv' || error.syscall === 'queryTxt')) {
        // These are transient DNS issues, MongoDB driver will retry automatically
        // No need to log them as errors
        return;
      }
      
      console.error('Uncaught Exception:', error);
    });
  }
}

