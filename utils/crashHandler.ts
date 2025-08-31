import { Alert } from 'react-native';

// Global error handler for unhandled promise rejections
const handleUnhandledRejection = (event: any) => {
    console.error('Unhandled Promise Rejection:', event.reason);

    // Log to console for debugging
    if (__DEV__) {
        Alert.alert(
            'Unhandled Promise Rejection',
            `${event.reason?.message || event.reason}`,
            [{ text: 'OK' }]
        );
    }
};

// Global error handler for JavaScript errors
const handleError = (error: Error, isFatal?: boolean) => {
    console.error('Global Error Handler:', error);

    if (__DEV__) {
        Alert.alert(
            'JavaScript Error',
            `${error.message}\n\nStack: ${error.stack}`,
            [{ text: 'OK' }]
        );
    }

    // In production, you might want to send this to a crash reporting service
    // like Sentry, Bugsnag, or Firebase Crashlytics
};

// Setup global error handlers
export const setupCrashHandlers = () => {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
        global.addEventListener?.('unhandledrejection', handleUnhandledRejection);
    }

    // Handle JavaScript errors
    if (typeof ErrorUtils !== 'undefined') {
        ErrorUtils.setGlobalHandler(handleError);
    }

    console.log('Crash handlers initialized');
};

// Safe async wrapper
export const safeAsync = async <T>(
    asyncFn: () => Promise<T>,
    fallback?: T,
    errorMessage?: string
): Promise<T | undefined> => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error(errorMessage || 'Async operation failed:', error);
        return fallback;
    }
};

// Safe function wrapper
export const safe = <T>(
    fn: () => T,
    fallback?: T,
    errorMessage?: string
): T | undefined => {
    try {
        return fn();
    } catch (error) {
        console.error(errorMessage || 'Function execution failed:', error);
        return fallback;
    }
};