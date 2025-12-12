import { Peer, DataConnection } from 'peerjs';
import { NetworkMessage } from '../types';

export class NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public myId: string = '';

  constructor(
    private onMessage: (msg: NetworkMessage) => void,
    private onConnect: () => void,
    private onDisconnect: () => void,
    private onError: (err: string) => void
  ) {}

  // Initialize Peer
  init(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a random ID. Use a prefix to make it slightly friendlier if desired, but default UUID is fine.
      // We'll just let PeerJS assign one or generate a short 4-char one.
      const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      this.peer = new Peer(shortId);

      this.peer.on('open', (id) => {
        this.myId = id;
        resolve(id);
      });

      this.peer.on('connection', (connection) => {
        if (this.conn) {
          // Already connected, reject new (or handle spectator in future)
          connection.close();
          return;
        }
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        this.onError(err.type);
      });

      this.peer.on('disconnected', () => {
         // Id might be lost
      });
    });
  }

  // Connect to another peer (Host)
  connect(hostId: string) {
    if (!this.peer) return;
    const conn = this.peer.connect(hostId);
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    this.conn = conn;

    conn.on('open', () => {
      this.onConnect();
    });

    conn.on('data', (data: any) => {
      this.onMessage(data as NetworkMessage);
    });

    conn.on('close', () => {
      this.conn = null;
      this.onDisconnect();
    });

    conn.on('error', (err) => {
      console.error("Connection error:", err);
      this.onError('Connection failed');
    });
  }

  send(msg: NetworkMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  close() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
