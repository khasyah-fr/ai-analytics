import duckdb from 'duckdb';
import { DATA_CSV_PATH } from '../config/index.ts';

let db: duckdb.Database | null = null;
let conn: duckdb.Connection | null = null;

export async function initDb(): Promise<duckdb.Connection> {
  if (conn) return conn;

  db = new duckdb.Database(':memory:');
  conn = db.connect();

  const initQuery = `
    CREATE OR REPLACE VIEW orders AS
    SELECT
        client_id, order_id,
        CAST(order_date AS DATE) AS order_date,
        TRY_CAST(delivery_date AS DATE) AS delivery_date,
        carrier, origin_city, destination_city, status, sku, product_category,
        CAST(quantity AS INTEGER) AS quantity,
        CAST(unit_price_usd AS DOUBLE) AS unit_price_usd,
        CAST(order_value_usd AS DOUBLE) AS order_value_usd,
        CAST(is_promo AS INTEGER) AS is_promo,
        TRY_CAST(promo_discount_pct AS INTEGER) AS promo_discount_pct,
        region, warehouse
    FROM read_csv_auto('${DATA_CSV_PATH.replace(/\\/g, '/')}', header=true);
  `;

  return new Promise((resolve, reject) => {
    conn!.run(initQuery, (err) => {
      if (err) return reject(err);
      console.log('DuckDB initialized.');
      resolve(conn!);
    });
  });
}

export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const connection = await initDb();
  return new Promise((resolve, reject) => {
    connection.all(sql, ...params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export async function getRowCount(): Promise<number> {
  const rows = await queryAll('SELECT COUNT(*) as count FROM orders;');
  return rows[0]?.count !== undefined ? Number(rows[0].count) : 0;
}