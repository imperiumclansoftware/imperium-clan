// Proxy du serveur de dev : le navigateur ne parle qu'au serveur Angular, qui relaie /api vers Symfony.
const api = process.env['API_URL'] ?? 'http://127.0.0.1:8000';

// Chemin sous lequel l'application est servie : « / » par défaut, « /absproxy/4210/ » derrière
// code-server (configuration « code-server » de angular.json).
const prefixes = ['', '/absproxy/4210'];

export default Object.fromEntries(
  prefixes.map((prefix) => [
    `${prefix}/api`,
    {
      target: api,
      secure: false,
      rewrite: (path) => path.slice(prefix.length),
    },
  ]),
);
