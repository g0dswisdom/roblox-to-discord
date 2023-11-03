import express from 'express';
import axios from 'axios';
import WebSocket from 'ws';
const app = express();

const websocketCloseCodes: Readonly<Record<number, string>> = {
  1000: "NormalClosure",
  1001: "GoingAway",
  1002: "ProtocolError",
  1003: "UnsupportedData",
  1005: "NoStatusReceived",
  1006: "AbnormalClosure",
  1007: "InvalidFramePayloadData",
  1008: "PolicyViolation",
  1009: "MessageTooBig",
  1010: "MissingExtension",
  1011: "InternalServerError",
  1012: "ServiceRestart",
  1013: "TryAgainLater",
  1014: "BadGateway",
  1015: "TLSHandshakeFailure",
  4000: 'Unknown error', // Try reconnecting?
  4001: 'Unknown opcode', // Invalid opcode
  4002: 'Decode error', // Invalid payload
  4003: 'Not authenticated', // You sent a payload prior to identifying
  4004: 'Authentication failed', // Incorrect token
  4005: 'Already authenticated', // You sent more than 1 identify payload
  4007: 'Invalid seq', // The sequence sent when resuming the session was invalid. Reconnect and start a new session
  4008: 'Rate limited', // Too many requests
  4009: 'Session timed out', // Session timed out. Reconnect and start a new one
  4010: 'Invalid shard', // You sent an invalid shard when identifying
  4011: 'Sharding required', // The session would have handled too many guilds - you are required to shard your connection in order to connect
  4012: 'Invalid API version', // Invalid version for gateway
  4013: 'Invalid intent(s)', // Invalid intents
  4014: 'Disallowed intent(s)' // Disallowed intents
}

let DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=9&encoding=json';

export class EventEmitter {
  private listeners: Record<string, Function[]>;

  constructor() {
    this.listeners = {};
  }

  public on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  public emit(event: string, ...args: any[]) {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        listener(...args);
      });
    }
  }
}

export class DiscordClient extends EventEmitter {
  private ws: WebSocket;
  private token: string;

  constructor(token: string) {
    super();
    this.token = token;
    this.ws = new WebSocket(DISCORD_GATEWAY);
    this.setupWebsocket();
  }

  get clientToken() {
    return this.token;
  }

  private setupWebsocket() {
    this.ws.on('open', () => {
      const payload = {
        op: 2,
        d: {
          token: this.token,
          intents: 3241725,
          properties: {
            $os: 'linux',
            $browser: 'my_library',
            $device: 'my_library',
          },
        },
      };
      this.ws.send(JSON.stringify(payload));
      this.emit('open');
    })

    this.ws.on('message', async (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());

      switch (message.op) {
        case 0:
          this.emit('messageCreate', message.d);
          break;
        case 10:
          const {
            heartbeat_interval
          } = message.d;
          setInterval(() => {
            this.ws.send(JSON.stringify({
              op: 1,
              d: null
            }));
            console.log(`[DISCORD]: sent heartbeat. interval: ${heartbeat_interval}`);
          }, heartbeat_interval);
          break;
      }
    })

    this.ws.on('close', async (code) => {
      const closeCode = websocketCloseCodes[code] || 'Unknown close code';
      console.log(`[DISCORD]: websocket closed due with code ${code}: ${closeCode}`);
    })

    this.ws.on('error', (err: Error) => console.log(err));
  }
}

export async function request(method: string, endpoint: string, data: any, headers: any) {
  var response: any;
  const auto = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9018 Chrome/108.0.5359.215 Electron/22.3.24 Safari/537.36",
  };
  const requestData = data && data.length >= 1 ? data : undefined;
  await axios({
    method: method,
    url: endpoint,
    data: data,
    headers: Object.assign({}, auto, headers),
  }).then((resp: any) => {
    response = resp;
  }).catch((err: Error) => console.log(err));
  return response;
}

app.use(express.json());

app.get('/', (req, res) => {
  res.send('xd why r u here')
});

app.get('/connect', async (req, res) => {
  let json = req.body;
  let token: any = req.headers['hi'];

  const client = new DiscordClient(token);

  client.on('open', () => {
    console.log('discord xd');
  })

  res.send('hi');
});

type discordUser = {
  id: string;
  type: number;
  nickname: null | string;
  user: {
    id: string;
    username: string;
    global_name: string;
    avatar: string;
    avatar_decoration_data: null | string;
    discriminator: string;
    public_flags: number
  };
  since: string;
}[];

app.get('/rel', async (req, res) => {
  let token: any = req.headers['ball'];

  const client = new DiscordClient(token);
  client.on('open', () => {
    console.log('relationshipsfpdlfg');
  })

  await request('get', 'https://discord.com/api/v9/users/@me/relationships', null, { Authorization: token, 'Referer': 'https://discord.com/channels/@me' }).then((resp) => {
    //console.log(resp);

    const data: discordUser = resp.data;
    let discordArray: Array<{ username: string; id: string }> = [];
    data.forEach(user => {
        const data2 = {
            username: user.user.username,
            id: user.user.id,
        };
        discordArray.push(data2);
    })
    res.json(discordArray)
    /*
    for (const user of discordArray) {
       const friend: string = `${user.username} | ${user.id}`;
       console.log(friend);
    }*/
    
  });
  //res.send('aaa');
})
export function generateNonce(timestamp: any = Date.now()) {
  const EPOCH = 1_420_070_400_000;
  let INCREMENT = BigInt(0);
  if (timestamp instanceof Date) timestamp = timestamp.getTime();
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      throw new TypeError(
          `"timestamp" argument must be a number (received ${isNaN(timestamp) ? 'NaN' : typeof timestamp})`
      );
  }
  if (INCREMENT >= 4095n) INCREMENT = BigInt(0);

  return ((BigInt(timestamp - EPOCH) << 22n) | (1n << 17n) | INCREMENT++).toString();
}
app.post('/msg', async (req, res) => {
  let json = req.body;
  let content: string = json.content;
  let id: string = json.id;
  let token: any = req.headers['okay'];
  const client = new DiscordClient(token);
  client.on('open', () => {
    console.log('msgs');
  })
  //
 await request("post", "https://discord.com/api/v9/users/@me/channels", {"recipients": [id]}, {Authorization: token, "Content-Type": "application/json", "Host": "discord.com", Origin: "https://discord.com", "Referer": `https://discord.com/channels/@me/${id}`}).then(async (resp) => {
    await request("post", `https://discord.com/api/v9/channels/${resp.data.id}/messages`, {"mobile_network_type" :"unknown", "content": content, nonce: generateNonce(), "tts": false, "flags" :0}, {Authorization: token, Host: "discord.com", "Content-Type": "application/json", Origin: "https://discord.com", "Referer": `https://discord.com/channels/@me/${resp.data.id}`}).catch((err) => console.log('[DISCORD]: could not send dm!'));
})
  res.send('aa');
})

type discordServer = {
  id: string;
  name: string,
  icon: null | string,
  owner: boolean,
  permissions: string,
}[];

app.get('/srvs', async (req, res) => {
  let token: any = req.headers['lol'];
  const client = new DiscordClient(token);
  client.on('open', () => {
    console.log('servers');
  })
  await request('get', 'https://discord.com/api/v9/users/@me/guilds', null, {'Authorization': token}).then((resp) => {
    let data: discordServer = resp.data;
    let discordArray: Array<{ name: string; id: string }> = [];

    data.forEach(ok => {
      const data2 = {
          name: ok.name,
          id: ok.id,
      };
      discordArray.push(data2);
    })
    res.json(discordArray)
  })
})

app.listen(3000, () => {
  console.log('ready');
})
