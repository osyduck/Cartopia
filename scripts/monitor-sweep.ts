import { runMonitorSweep } from "@/lib/services/monitoring";

// One-off monitoring sweep (ping instances + sample metrics).
async function main() {
  const res = await runMonitorSweep();
  console.log(
    `monitor-sweep: ${res.instancesChecked} instances, ${res.databasesSampled} sampled`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
