import { db } from "../src/core/db/models";
import { exec } from "child_process";

export const clearDatabaseSchema = async () => {
  await db.sequelize.query("DROP TABLE IF EXISTS `uniswap_v3_positions`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `v3_rebalance_states`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `versions`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `strategy_tvls`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `user_tvls`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `risk_strategies`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `user_tvls`;");
  await db.sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`;");
};

export const runMigrations = async () =>
  new Promise((resolve, reject) => {
    const sleepMigrate = exec(
      "sequelize-cli db:migrate",
      // @ts-ignore
      { NODE_ENV: process.env.NODE_ENV },
      (err) => (err ? reject(err) : resolve(true))
    );
    sleepMigrate.stdout.pipe(process.stdout);
    sleepMigrate.stderr.pipe(process.stderr);
  });

