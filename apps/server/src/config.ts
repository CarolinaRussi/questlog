export type ServerConfig = {
  host: string;
  port: number;
};

export function loadConfig(): ServerConfig {
  const portRaw = process.env.QUESTLOG_PORT?.trim() || "8787";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid QUESTLOG_PORT: ${portRaw}`);
  }

  return {
    host: "127.0.0.1",
    port,
  };
}
