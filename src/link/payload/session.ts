export interface UpdateSession {
  /**
   * Whether resuming is enabled for this session or not
   */
  resuming: boolean;
  /**
   * The timeout in seconds (default is 60s)
   */
  timeout: number;
}
