import { mkdirSync, writeFileSync } from 'node:fs';
import { simulate } from '../src/engine/simulation';

const runs = Number(process.argv[2] ?? 1000);
const firstSeed = Number(process.argv[3] ?? 1);
const reports = [simulate('random', runs, firstSeed), simulate('greedy', runs, firstSeed)];
mkdirSync('reports', { recursive: true });
writeFileSync('reports/simulation.json', JSON.stringify({ reports }, null, 2) + '\n');
for (const report of reports) {
  console.log(`\n${report.strategy}: ${report.runs} runs, seeds ${report.firstSeed}–${report.lastSeed}`);
  console.table(report.rounds.map(row => ({ round: row.round, entered: row.entered, cleared: row.cleared, survival: `${(row.survivalRate * 100).toFixed(1)}%`, averageScore: row.averageScore?.toFixed(2) ?? 'N/A', averageCredits: row.averageCreditsEarned?.toFixed(2) ?? 'N/A' })));
  console.log(`Victory ${(report.victoryRate * 100).toFixed(2)}%; average Credits earned ${report.averageCreditsEarned.toFixed(3)}`);
  console.table(report.purchases);
}
