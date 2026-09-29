export const portfolioDraftSchema = "CREATE TABLE IF NOT EXISTS portfolio_draft (id integer PRIMARY KEY, content text NOT NULL, updated_at text NOT NULL)";
export const adminConfigSchema = "CREATE TABLE IF NOT EXISTS admin_config (id text PRIMARY KEY, value text NOT NULL)";
