export default honeybadger;
declare namespace honeybadger {
    /**
     * Initialize and configure the Honeybadger React Native library.
     * @param {string} apiKey - Your Honeybadger API key.
     * @param {boolean} [reportErrors=true] reportErrors - Whether to send error reports to Honeybadger (disable for dev environments, etc.)
     * @param {string=} revision - The git revision of the current build.
     * @param {string=} projectRoot - The path to the project root.
     */
    function configure(apiKey: string, reportErrors?: boolean, revision?: string, projectRoot?: string): void;
    /**
     * Initialize and configure the Honeybadger React Native library.
     * @param {string} apiKey - Your Honeybadger API key.
     * @param {boolean} [reportErrors=true] reportErrors - Whether to send error reports to Honeybadger (disable for dev environments, etc.)
     * @param {string=} revision - The git revision of the current build.
     * @param {string=} projectRoot - The path to the project root.
     */
    function configure(apiKey: string, reportErrors?: boolean, revision?: string, projectRoot?: string): void;
    /**
     * Send any kind of error, exception, object, String, etc. to Honeybadger.
     * @param {string|object} err - The error string or object.
     * @param {string|object} additionalData - Additional data to include with the error.
     */
    function notify(err: any, additionalData: any): void;
    /**
     * Send any kind of error, exception, object, String, etc. to Honeybadger.
     * @param {string|object} err - The error string or object.
     * @param {string|object} additionalData - Additional data to include with the error.
     */
    function notify(err: any, additionalData: any): void;
    /**
     * Include additional data whenever an error or an exception occurs. This can be called as many times as needed. New context data will be merged with any previously-set context data.
     * @param {object} context - Additional data to include with all errors and exceptions.
     */
    function setContext(context: any): void;
    /**
     * Include additional data whenever an error or an exception occurs. This can be called as many times as needed. New context data will be merged with any previously-set context data.
     * @param {object} context - Additional data to include with all errors and exceptions.
     */
    function setContext(context: any): void;
    /**
     * Clears/resets any data previously set through setContext().
     * @param {object=} context - Optional new context to set.
     */
    function resetContext(context?: any): void;
    /**
     * Clears/resets any data previously set through setContext().
     * @param {object=} context - Optional new context to set.
     */
    function resetContext(context?: any): void;
    /**
     * Sets the logging level for the Honeybadger library.
     * @param {('debug'|'warning'|'error')} [level=warning] - The logging level.
     */
    function setLogLevel(level?: "error" | "warning" | "debug"): void;
    /**
     * Sets the logging level for the Honeybadger library.
     * @param {('debug'|'warning'|'error')} [level=warning] - The logging level.
     */
    function setLogLevel(level?: "error" | "warning" | "debug"): void;
}
