// Compète de zinzin : liaison entre téléphones par des relais MQTT publics (WebSocket), sans serveur à nous.
// On se connecte à DEUX relais à la fois et on publie chaque message sur les deux ; à la réception,
// les doublons sont éliminés (par id pour les actions, par ts pour l'état).
// Topics, sous zinzin/v1/<code>/ :
//   state : arbitre → tous, { G, ts, acks }, QoS 1, retenu (un arrivant le reçoit tout de suite) ; vide = partie terminée
//   act   : invité → arbitre, { t, cid, id, ... }, QoS 1
// Aucune donnée sensible dans les messages : les relais sont publics.

export const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];

let libPromise = null;
function loadLib() {
  // mqtt.js (MIT) est livré dans vendor/ : pas de script externe (règle de la CSP)
  libPromise ||= import('./vendor/mqtt.esm.js' + new URL(import.meta.url).search).then((m) => {
    const lib = m.default?.connect ? m.default : m.default?.default?.connect ? m.default.default : m;
    if (!lib.connect) throw new Error('mqtt.js introuvable');
    return lib;
  });
  return libPromise;
}

/**
 * Ouvre la liaison d'une partie.
 *   role     : 'host' (arbitre) | 'guest' (invité)
 *   onState  : (msg | null) → état reçu (invité), null si la partie est terminée
 *   onAct    : (action) → action reçue (arbitre)
 *   onStatus : (connecté: bool) → au moins un relais est joignable
 *   brokers  : liste des relais (par défaut les deux relais publics, ou un relais local pour les tests)
 * → { sendState(msg), sendAct(action), clearState(), wake(), close() }
 */
export async function openLink({ code, cid, role, onState = () => {}, onAct = () => {}, onStatus = () => {}, brokers = BROKERS }) {
  const mqtt = await loadLib();
  const base = `zinzin/v1/${code}/`;
  const listen = role === 'host' ? base + 'act' : base + 'state';
  let lastTs = 0;
  const seen = new Set();
  const seenOrder = [];
  let closed = false;

  const clients = brokers.map((url, i) => {
    const c = mqtt.connect(url, {
      // L'arbitre garde sa session (clean: false) : les actions envoyées pendant qu'il était en veille lui sont remises.
      clientId: `zz${role === 'host' ? 'h' : 'g'}_${cid}_${code}_${i}`.slice(0, 64),
      clean: role !== 'host',
      keepalive: 20,
      reconnectPeriod: 2000,
      connectTimeout: 8000,
      resubscribe: true,
    });
    c.on('connect', () => { c.subscribe(listen, { qos: 1 }); status(); });
    c.on('close', status);
    c.on('offline', status);
    c.on('error', () => {});
    c.on('message', (topic, buf) => {
      if (closed) return;
      const text = buf?.length ? new TextDecoder().decode(buf) : '';
      if (role === 'host') {
        let a; try { a = JSON.parse(text); } catch { return; }
        if (!a || typeof a !== 'object' || !a.id || seen.has(a.id)) return;
        seen.add(a.id); seenOrder.push(a.id);
        if (seenOrder.length > 500) seen.delete(seenOrder.shift());
        onAct(a);
      } else {
        if (!text) { onState(null); return; }
        let m; try { m = JSON.parse(text); } catch { return; }
        if (!m?.G || !(m.ts > lastTs)) return;
        lastTs = m.ts;
        onState(m);
      }
    });
    return c;
  });

  let wasUp = null;
  function status() {
    const up = clients.some((c) => c.connected);
    if (up !== wasUp) { wasUp = up; onStatus(up); }
  }

  const publish = (topic, payload, retain) => {
    for (const c of clients) c.publish(topic, payload, { qos: 1, retain });
  };

  return {
    sendState(msg) { publish(base + 'state', JSON.stringify(msg), true); },
    sendAct(a) { publish(base + 'act', JSON.stringify(a), false); },
    clearState() { publish(base + 'state', '', true); }, // message retenu vide : la partie est terminée
    get connected() { return clients.some((c) => c.connected); },
    wake() { for (const c of clients) if (!c.connected && !c.disconnecting) c.reconnect(); },
    close() {
      closed = true;
      for (const c of clients) { try { c.end(false); } catch { /* ignore */ } }
    },
  };
}
