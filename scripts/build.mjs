import { mkdir, rm, cp } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'style.css', 'countdown.js', 'rockytop', 'gators', 'dixielanddelight', 'texas', 'basketball', 'football', 'leaderboard', 'shipping']) {
  await cp(file, `dist/${file}`, { recursive: true, filter: path => !path.endsWith('.DS_Store') && !path.endsWith('.md') });
}
await mkdir('dist/arcade');
for (const file of ['challenge.js', 'leaderboard.js']) await cp(`arcade/${file}`, `dist/arcade/${file}`);
console.log('Static site built; Netlify bundles the leaderboard function separately.');
