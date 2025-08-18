import http from 'http';
import EventSource from 'eventsource';

test('SSE init puis tick', done => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('data: {"type":"init"}\n\n');
    setTimeout(() => {
      res.write('data: {"type":"tick"}\n\n');
    }, 50);
  }).listen(0, () => {
    const port = server.address().port;
    const es = new EventSource(`http://localhost:${port}`);
    let receivedInit = false;
    es.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init') receivedInit = true;
      if (msg.type === 'tick' && receivedInit) {
        es.close();
        server.close();
        done();
      }
    };
  });
});
