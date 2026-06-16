export type RequestLocalsAuth<T> = {
  token: string;
  decodedToken: T;
};

export type RequestLocals = {
  auth?: RequestLocalsAuth<any>;
  config: Record<string, any>;
  correlationId: string;
  logger: any;
  startPerformance: number;
  startTime: string;
};
